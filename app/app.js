(function(){
	"use strict";
	/*global $:false, jQuery:false */

	var app = angular.module('foramendata', ['ui.bootstrap','angularCharts','chartsCtrl','angularMoment'])


	.run(function($rootScope, $templateCache) {

	   $rootScope.$on('$viewContentLoaded', function() {
	      	$templateCache.removeAll();
			$rootScope.loadingShowing = false;
	   });
	})

	.directive("scroll", function($window) {
		return function(scope, element, attr){
			angular.element($window).bind("scroll", function(){
				if(this.pageYOffset >= $('#selection').height()){
					scope.boolChangeClass = true;
				}else{
					scope.boolChangeClass = false;
				}
				scope.$apply();
			});
		};
	})

	.filter('percentage', ['$filter', function ($filter) {
		return function (input, decimals) {
			if(isNaN(input)){
				return 0 + '%';
			}else{
				return $filter('number')(input * 100, decimals) + '%';
			}
		};
	}])

	.filter('iif', function () {
   	return function(input, trueValue, falseValue) {
    	return input ? trueValue : falseValue;
  	};
	})

	.filter('readableTime', ['$filter', function ($filter) {

		function pad2(number){
			return (number < 10 ? '0' : '') + number;
		}

		return function(input){
			if(!isNaN(input)){
				var totalSecs = input;
				var hours = Math.floor(totalSecs / 3600);
				totalSecs %= 3600;
				var minutes = Math.floor(totalSecs / 60);
				var seconds = Math.floor(totalSecs % 60).toFixed(0);

				return pad2(hours)+":"+pad2(minutes)+":"+pad2(seconds);
			}else{
				return "00:00:00";
			}

		};
	}])

	.controller('FileAPIController', ['$scope','$rootScope', function($scope, $rootScope){

		$scope.handleFileSelect = function(event){

			$scope.$apply();
			var files = event.target.files;
			var output = []
			var i, f, reader, obj;

			var numOfFiles = files.length;

			$rootScope.loadingShowing = true;
			$rootScope.$apply();
			for(i = 0; i < numOfFiles; i++){

				f = files[i];

				output.push('<li>', escape(f.name), '</li>');

				var tmp = [];
				var num = 1;
				if(numOfFiles === 1){

					reader = new FileReader();
					reader.onload = (function(theFile){
						return function(e) {
							obj = JSON.parse(e.target.result);
							$scope.$root.$broadcast('gotData', obj);
						};
					})(f);

				}else{
						//multiple files
						reader = new FileReader();
						reader.onload = (function(theFile){
							return function(e) {
								var res = JSON.parse(e.target.result);
								for(i = 0; i < res.length; i++){
									res[i].weekNum = num;
								}

								tmp.push(res);
								if(files.length <= num){

									var data = [];
									angular.forEach(tmp, function(values){
										data = data.concat(values);
									});

									$scope.$root.$broadcast('gotData', data);
								}
								num++;
							};
						})(f);
				}
				reader.readAsText(f);
			}

			document.getElementById('fileList').innerHTML = '<ul>'+ output.join('') + '</ul>';

		};

		document.getElementById('files').addEventListener('change', $scope.handleFileSelect, false);

	}])

	.controller('DataController', ['$scope','$http', '$anchorScroll', '$q', '$modal', '$rootScope',
		function($scope, $http, $anchorScroll, $q, $modal, $rootScope){

		//defaults
		$scope.userRoleFilter = ['Kuntoutuja'];
		$scope.groupComparison = false;


		//filtering with one model&button:
		//filter attribute & targetGroup boolean
		$scope.filterModel = ['Kuntoutuja',false];

		$scope.filterModelChanged = function(){

			if(!this.filterModel){

				if($scope.previousFilterModel){
					this.filterModel = $scope.previousFilterModel;
				}else{
					this.filterModel = $scope.filterModel;
				}

			}else{
				$scope.previousFilterModel = this.filterModel;

				$scope.groupComparison = this.filterModel[this.filterModel.length-1];
				if(this.filterModel.length > 2){
					$scope.userRoleFilter = [this.filterModel[0], this.filterModel[1]];
				}else{
					$scope.userRoleFilter = [this.filterModel[0]];
				}

			}


			console.log('changed', this.filterModel);
			console.log('userrolefilter', $scope.userRoleFilter);
			console.log('groupcomparison', $scope.groupComparison);
			$scope.render();
		};

		$scope.render = function(){
			if($rootScope.wholeData){
				$scope.$root.$broadcast('gotData', $rootScope.wholeData);
			}
		};

		$scope.orderByField = 'game';
		$scope.orderGroupsByField = 'game';
		$scope.reverseSort = false;

		$scope.forceShowUnplayedGames = false;

		$scope.openModal = function (user, size) {
			$scope.user = user;

			var modalInstance = $modal.open({
				//templateUrl: 'app/charts/charts.html' same origin policy for file:// so template in index.html
				templateUrl: 'chartsContent.html',
				controller: 'ModalInstanceController',
				size: size,
				backdrop: 'static',
				resolve: {
					items: function(){
						return $scope.user;
					}
				}
			});

			modalInstance.result.then(function(){
			},function(){
				$('.ac-tooltip').css('display','none');
			});

		};

		$scope.scrollTop = function(){
				$anchorScroll(0);
		};


		$scope.median = function(values){
			if(values.length < 0){
				return;
			}
			values.sort(
				function(a,b) {
					return a - b;
				}
			);

			var half = Math.floor(values.length/2);

			if(values.length % 2){
				return values[half];
			}else{
				return (values[half-1] + values[half]) / 2;
			}

		};

		$scope.$on('gotData', function(event, obj){


			console.log('got data');
			$scope.parseData(obj);
		});

		$scope.parseData = function(data){
			$rootScope.wholeData = data;

			// console.log(data);
			$scope.users = [];
			$scope.groups = [];
			var users = [];
			var players = [];
			var groups = [];
			var uniqueGroups = [];
			var uniquePlayers = [];
			var tempArr = [];
			var i, j, k, l;
			var returnArr = [];

			$scope.leastPlaysOnGroup = undefined;
			$scope.mostPlaysOnGroup = undefined;
			$rootScope.smallestDate = undefined;
			$rootScope.largestDate = undefined;

			for(i = 0; i < data.length; i++){
				groups.push(data[i].groupName);
			}

			$.each(groups, function(i, el){
				if($.inArray(el, uniqueGroups) === -1){
					uniqueGroups.push(el);
				}
			});

			for(i = 0; i < data.length; i++){
				players.push(data[i].playerName);
			}

			$.each(players, function(i, el){
				if($.inArray(el, uniquePlayers) === -1){
					uniquePlayers.push(el);
				}
			});

			for(i = 0; i < uniquePlayers.length; i++){
				users.push({'name': uniquePlayers[i], group: undefined,
					'overall': {
							duration:0, durationsArr:[],
							level1:0,level2:0,level3:0,
							totalPlays:0, unfinished:0,
							exerciseDays:[]
						},
					'data': [
						{	game: 'Muista näkemäsi numerosarja',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Jätkänshakki',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Sudoku',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Tunnista sanat',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Päättele salasana',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Muista viesti',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Rakenna kuvio mallista',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Muista näkemäsi esineet',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Etsi kuvat',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						},
						{	game: 'Muista kuulemasi sanat',
							plays: [], level1:0, level2:0,
							level3:0, unfinished:0, duration:0, finishedPercentage:0,
							exerciseTimeMedian:0, exerciseTimeAvg:0,
							durationsArr:[], exerciseDays:[]
						}
					]
				});
			}

			var parsedStartDate;
			for(i = 0; i < data.length; i++){
				for(j = 0; j < users.length; j++){

					var instructors = [];
					//console.log($scope.userRoleFilter);
					if($scope.userRoleFilter.indexOf('Kuntoutuja') > -1){
						instructors = ['Ella Niini Muistiohjaaja','Ella Niini','Samppa Valkama', 'Helena Launiainen', 'Tomi Nevalainen','Ulla Arifullen-', 'Ulla Arifullen-Hämäläinen', 'Ulla Arifullen-                       Hämäläinen', 'Teuvo ja Tuuli Testeri', 'Maiju Malli'];
					}
					if($scope.userRoleFilter.indexOf(data[i].userRole) > -1 && instructors.indexOf(data[i].playerName) === -1 && data[i].playerName === users[j].name){
						//console.log(data[i].playerName, data[i]);
						for(k = 0; k < users[j].data.length; k++){

							//ääkköset hack
							if(data[i].gameTitle === "Jatkanshakki"){
								data[i].gameTitle = "Jätkänshakki";
							}else if(data[i].gameTitle === "Muista nakemasi esineet"){
								data[i].gameTitle = "Muista näkemäsi esineet";
							}else if(data[i].gameTitle === "Paattele salasana"){
								data[i].gameTitle = "Päättele salasana"
							}else if(data[i].gameTitle === "Muista nakemasi numerosarja"){
								data[i].gameTitle = "Muista näkemäsi numerosarja";
							}

							// if(data[i].playerName === "Tarja ja Seppo Väkevä"){
							// 	console.log(data[i].endDate);
							// }

							if(data[i].gameTitle === users[j].data[k].game ){
								users[j].data[k].plays.push(data[i]);

								//gametime
								if(data[i].duration){

									users[j].data[k].duration += parseInt(data[i].duration,0);

									users[j].data[k].durationsArr.push(parseInt(data[i].duration,0));

								}else if(data[i].endDate && data[i].startDate){
									//if duration happens to be null (?)
									//calculate it here

									var calcDur = 0;
									var endDate = new Date(data[i].endDate);
									var startDate = new Date(data[i].startDate);
									calcDur = Math.abs(endDate.getTime() - startDate.getTime());
									var timeDiff = Math.ceil(calcDur / 1000);

									if(timeDiff > 4){
										users[j].data[k].duration += parseInt(timeDiff,0);
										users[j].data[k].durationsArr.push(parseInt(timeDiff,0));
									}
								}

								//unfinishes quizzes
								if(data[i].endDate.length === 0){
									users[j].data[k].unfinished++;
								}

								//plays per difficulty level
								if(data[i].difficulty === "Taso I"){
									users[j].data[k].level1++;
								}else if(data[i].difficulty === "Taso II"){
									users[j].data[k].level2++;
								}else{
									users[j].data[k].level3++;
								}

								//amount of exercise days per exercise & groupname
								for(l = 0; l < users[j].data[k].plays.length; l++){

									//group
									if(typeof users[j].group === "undefined" && users[j].data[k].plays[l]){
										users[j].group = users[j].data[k].plays[l].groupName;
									}

									//exercise days
									parsedStartDate = "";
									if(users[j].data[k].plays[l].startDate.length > 10){
										parsedStartDate = moment(users[j].data[k].plays[l].startDate).format("DD.MM.YYYY").toString();
									}else{
										parsedStartDate = users[j].data[k].plays[l].startDate;
									}

									if(users[j].data[k].exerciseDays.indexOf(parsedStartDate) == -1){
										users[j].data[k].exerciseDays.push(parsedStartDate);
									}

								}

								//lets find smallest and largest startDate to get active week
								var d = new Date();
								//days 1-31 & months 0-11
								d.setDate(parseInt(parsedStartDate.substring(0,2),0));
								d.setMonth(parseInt(parsedStartDate.substring(3,5),0)-1);

								if($rootScope.smallestDate === undefined || d < $rootScope.smallestDate ){
									$rootScope.smallestDate = d;
								}

								if($rootScope.largestDate === undefined || d > $rootScope.largestDate){
									$rootScope.largestDate = d;
								}
							}
						}
					}
				}
			}

			//finishes quizzes percentage, average/median gametime per game
			for(i = 0; i < users.length; i++){
				for(j = 0; j < users[i].data.length; j++){

					//finished quizzes percentage
					users[i].data[j].finishedPercentage = (users[i].data[j].plays.length - users[i].data[j].unfinished ) / users[i].data[j].plays.length;
					if(isNaN(users[i].data[j].finishedPercentage)){
						users[i].data[j].finishedPercentage = 0;
					}

					//exercise time median
					users[i].data[j].exerciseTimeMedian = $scope.median(users[i].data[j].durationsArr);
					if(isNaN(users[i].data[j].exerciseTimeMedian)){
						users[i].data[j].exerciseTimeMedian	= 0;
					}

					//exercise time avarage
					users[i].data[j].exerciseTimeAverage = users[i].data[j].duration / users[i].data[j].plays.length;
					if(isNaN(users[i].data[j].exerciseTimeAverage)){
						users[i].data[j].exerciseTimeAverage = 0;
					}

				}
			}


			//overalls
			for(i = 0; i < users.length; i++){
				for(j = 0;	j < users[i].data.length; j++){
					//console.log(parseInt(users[i].data[j].unfinished,0));
					//console.log(users[i].overall.duration);

					//unfinished and all started games
					users[i].overall.unfinished += parseInt(users[i].data[j].unfinished,0);
					users[i].overall.totalPlays += parseInt(users[i].data[j].plays.length,0);

					//overall plays per level
					users[i].overall.level1 += parseInt(users[i].data[j].level1,0);
					users[i].overall.level2 += parseInt(users[i].data[j].level2,0);
					users[i].overall.level3 += parseInt(users[i].data[j].level3,0);

					//overall duration
					users[i].overall.duration += parseInt(users[i].data[j].duration,0);

					//all duration to calculate median or avg
					users[i].overall.durationsArr.push(parseInt(users[i].data[j].duration,0));

					//amount of exercise days (all exercises)
					for(k = 0; k < users[i].data[j].plays.length; k++){

						parsedStartDate = "";
						if(users[i].data[j].plays[k].startDate.length > 10){
							parsedStartDate = moment(users[i].data[j].plays[k].startDate).format("DD.MM.YYYY").toString();
						}else{
							parsedStartDate = users[i].data[j].plays[k].startDate;
						}

						if(users[i].overall.exerciseDays.indexOf(parsedStartDate) == -1){
							users[i].overall.exerciseDays.push(parsedStartDate);
						}
					}
				}
			}



			//group overalls
			for(i = 0; i < data.length; i++){
				groups.push(data[i].groupName);
			}

			$.each(groups, function(i, el){
				if($.inArray(el, uniqueGroups) === -1){
					uniqueGroups.push(el);
				}
			});

			groups = [];
			var games = ['Muista näkemäsi numerosarja', 'Jätkänshakki', 'Sudoku', 'Tunnista sanat', 'Päättele salasana',
			'Muista viesti', 'Muista näkemäsi esineet', 'Etsi kuvat', 'Muista kuulemasi sanat', 'Rakenna kuvio mallista'];

			for(i = 0; i < uniqueGroups.length; i++){
				groups.push({'name': uniqueGroups[i],
					'leastPlays': undefined,
					'leastTimePlayed': undefined,
					'mostPlays': undefined,
					'mostTimePlayed': undefined,
					'members': [],
					'data': [],
					'sum': {
						'allGamePlays': 0,
						'unfinishedPlays':0,
						'lvl1Plays': 0,
						'lvl2Plays': 0,
						'lvl3Plays': 0,
						'duration': 0,
					}
				});

				for(j = 0; j < games.length; j++){
					groups[i].data[j] = {'game': games[j], 'gameData': [],
					'overalls': {
						'lvl1Plays': 0,
						'lvl2Plays': 0,
						'lvl3Plays': 0,
						'duration': 0,
						'unfinishedPlays': 0,
						'finishedPercentage': 0,
						'finishedAverage':0
					}};
				}
			}

			for(i = 0; i < data.length; i++){
				for(j = 0; j < groups.length; j++){
					for(k = 0; k < groups[j].data.length; k++){

						if(groups[j].name === data[i].groupName && groups[j].data[k].game === data[i].gameTitle &&
							$scope.userRoleFilter.indexOf(data[i].userRole) > -1){

							groups[j].data[k].gameData.push(data[i]);
						}


						if(groups[j].name === data[i].groupName && $scope.userRoleFilter.indexOf(data[i].userRole) > -1  &&
							groups[j].members.indexOf(data[i].playerName) === -1){

							groups[j].members.push(data[i].playerName);
						}

					}
				}
			}

			for(i = 0; i < groups.length; i++){
				for(j = 0; j < Object.keys(groups[i].data).length; j++){
					for(k = 0; k < groups[i].data[j].gameData.length; k++){

						if(groups[i].data[j].gameData[k].difficulty === 'Taso I'){
							groups[i].data[j].overalls.lvl1Plays++;
						}else if(groups[i].data[j].gameData[k].difficulty === 'Taso II'){
							groups[i].data[j].overalls.lvl2Plays++;
						}else{
							//joker or lvl3
							groups[i].data[j].overalls.lvl3Plays++;
						}

						//duration might be null? wonder why
						if(groups[i].data[j].gameData[k].duration !== null){
							groups[i].data[j].overalls.duration += parseInt(groups[i].data[j].gameData[k].duration,0);

						}else if(groups[i].data[j].gameData[k].endDate && groups[i].data[j].gameData[k].startDate){
							//if duration happens to be null (?)
							//calculate it here - unfinished quizzes shouldn't have endDate, right?

							var calcDur = 0;
							var endDate = new Date(groups[i].data[j].gameData[k].endDate);
							var startDate = new Date(groups[i].data[j].gameData[k].startDate);
							calcDur = Math.abs(endDate.getTime() - startDate.getTime());
							var timeDiff = Math.ceil(calcDur / 1000);

							if(timeDiff > 4){
								groups[i].data[j].overalls.duration += parseInt(timeDiff,0);
							}

						}

						if(groups[i].data[j].gameData[k].endDate.length === 0){
							groups[i].data[j].overalls.unfinishedPlays++;

						}
					}
				}
			}


			//least and most plays/time per group
			for(i = 0; i < users.length; i++){
				for(j = 0; j < groups.length; j++){

					if(users[i].group === groups[j].name){

						if(typeof groups[j].mostPlays === "undefined" || groups[j].mostPlays < users[i].overall.totalPlays){
							groups[j].mostPlays = users[i].overall.totalPlays;
						}

						if(typeof groups[j].leastPlays === "undefined" || groups[j].leastPlays > users[i].overall.totalPlays){
							groups[j].leastPlays = users[i].overall.totalPlays;
						}

						if(typeof groups[j].mostTimePlayed === "undefined" || groups[j].mostTimePlayed < users[i].overall.duration){
							groups[j].mostTimePlayed = users[i].overall.duration;
						}

						if(typeof groups[j].leastTimePlayed === "undefined" || groups[j].leastTimePlayed > users[i].overall.duration){
							groups[j].leastTimePlayed = users[i].overall.duration;
						}

					}
				}
			}


			for(i = 0; i < data.length; i++){
				if($scope.userRoleFilter.indexOf(data[i].userRole) > -1 ){
					for(j = 0; j < groups.length; j++){

						if(data[i].groupName === groups[j].name){

							groups[j].sum.allGamePlays++;

							if(data[i].endDate.length === 0){
								groups[j].sum.unfinishedPlays++;
							}

							if(data[i].difficulty === "Taso I"){
								groups[j].sum.lvl1Plays++;
							}else if(data[i].difficulty === "Taso II"){
								groups[j].sum.lvl2Plays++;
							}else{
								groups[j].sum.lvl3Plays++;
							}

							if(data[i].duration !== null){
								groups[j].sum.duration += parseInt(data[i].duration,0);
							}

							for(k = 0; k < groups[j].data.length; k++){

								groups[j].data[k].overalls.finishedPercentage = (groups[j].data[k].gameData.length - groups[j].data[k].overalls.unfinishedPlays) / groups[j].data[k].gameData.length;
								if(isNaN(groups[j].data[k].overalls.finishedPercentage)){
									groups[j].data[k].overalls.finishedPercentage = 0;
								}


								groups[j].data[k].overalls.finishedAverage = (groups[j].data[k].gameData.length - groups[j].data[k].overalls.unfinishedPlays) / groups[j].members.length;
								//console.log(groups[j].data[k].overalls.finishedAverage);

							}
						}
					}
				}
			}

			// console.log('groups', groups);
			//console.log('users', users);
			console.log('parsing finished', users, groups);
			$scope.groups = groups;
			$scope.users = users;

			$rootScope.loadingShowing = false;
			$('#data').css('display', 'block');

			if(!$scope.$$phase) {
				$scope.$apply();
			}
		};

	}])

	.controller('ModalInstanceController', function($scope, $modalInstance, items, $rootScope){

		$rootScope.modalUser = items;

		$scope.close = function(){
			$modalInstance.dismiss('close');
		};

	})

	.directive('printDiv', function(){
		//iframe print hack(ish)

		return {
			restrict: 'A',
			link: function(scope, element, attrs){
				element.bind('click', function(e){
					e.preventDefault();
					PrintElem(attrs.printDiv);
				});

				function PrintElem(elem){
					var myElem = $(elem).clone();

					console.log(myElem.attr('id'));

					var orientation;
					if(myElem.attr('id') === "bar-chart") {
						myElem.find('.ac-legend').remove();
						orientation = 'landscape';
					}else{
						orientation = 'portrait';
					}


					var html = $(myElem).html();

					//console.log(html);

					PrintWithIframe(html, orientation);
				}

				function PrintWithIframe(data, orientation){

					// console.log(data);

					if( $('iframe#printf').size() == 0 ){
						$('html').append('<iframe id="printf" name="printf"></iframe>');
						var mywindow = window.frames["printf"];
						mywindow.document.write('<html><head><title></title><style>@page {margin: 10mm 0mm 25mm 5mm; size: '+orientation+'}</style>'
							+ '</head><body><div>'
							+ data
							+ '</div></body></html>');

						$(mywindow.document).ready(function(){
							mywindow.print();
							setTimeout(function(){
								$('iframe#printf').remove();
							},
							2000);
						});
					}
					return true;

				}
			}
		};
	});

})();
