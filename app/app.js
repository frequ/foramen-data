(function(){
	"use strict";
	/*global $:false, jQuery:false */

	var app = angular.module('foramendata', ['ui.bootstrap','angularCharts','chartsCtrl'])

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

	.controller('FilesController', ['$scope', '$http', function($scope, $http){

		var files = [];
		var file;

		$scope.getFileNames = function(){
			var promise = $http.get('./json');

			promise
				.success(function(data, status, headers, config){
					$scope.digForNames(data);
				})
				.error(function(){
					console.log('fetching filenames failed');
				});
		};

		$scope.digForNames = function(data){
			var files = [];

			$(data).find('a:contains(".json")').each(function(){
				file = this.href.replace(window.location.host, "").replace("http:///","").replace("foramen-data/","");
				files.push(file);
			});
			$scope.files = files;
		};

		$scope.passFileName = function(name){
			if(name.length > 1){
					$scope.$root.$broadcast('gotFileName', name, true);
			}else{
				$scope.$root.$broadcast('gotFileName', name);
			}
		};
		$scope.getFileNames();
	}])


	.controller('DataController', ['$scope','$http', '$anchorScroll', '$q', '$modal', function($scope, $http, $anchorScroll, $q, $modal){

		$scope.setFilter = function(arr){
			$scope.userRoleFilter = arr;
			console.log('filtering by userRoles', arr);
		};

		$scope.orderByField = 'game';
		$scope.reverseSort = false;

		$scope.smallestDate = undefined;
		$scope.largestDate = undefined;
		$scope.durations = [];

		$scope.forceShowUnplayedGames = false;

		$scope.openModal = function (user, size) {
			$scope.user = user;

			var modalInstance = $modal.open({
				templateUrl: 'app/charts/charts.html',
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

		$scope.$on('gotFileName', function(event, filename, multiple){
			$scope.loadingShowing = true;
			$scope.getData(filename, multiple);
		});

		$scope.getData = function(filename, multiple){
			console.log('getdata', filename, multiple);
			var datas = [];
			if(!multiple){
				var dataPromise = $http.get('json/'+filename);

				dataPromise
					.success(function(data, status, headers, config){
						$scope.parseData(data);
					})
					.error(function(data){
						console.log('error fetching data');
					});

			}else{
				var jsons = [];
				var files = filename;

				for(var i = 0; i < files.length; i++)(
					jsons[i] = $http.get('json/'+files[i])
				);

				$q.all(jsons).then(function(result){
					var tmp = [];
					angular.forEach(result, function(response){
						tmp.push(response.data);
					});
					return tmp;
				}).then(function(tmpResult){
					var data = [];
					angular.forEach(tmpResult, function(values){
						data = data.concat(values);
					});
					$scope.parseData(data);
				});
			}

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

		$scope.parseData = function(data){
			$('#data').css('display', 'block');

			$scope.users = [];
			$scope.smallestDate = undefined;
			$scope.largestDate = undefined;
			var users = [];
			var players = [];
			var uniquePlayers = [];
			var tempArr = [];
			var i, j, k, l;

			//todo surely this can be achieved more efficiently

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

			for(i = 0; i < data.length; i++){
				for(j = 0; j < users.length; j++){

					if($scope.userRoleFilter.indexOf(data[i].userRole) > -1 && data[i].playerName === users[j].name){
						for(k = 0; k < users[j].data.length; k++){

							if(data[i].gameTitle === users[j].data[k].game ){
								users[j].data[k].plays.push(data[i]);

								//gametime
								if(data[i].duration){
									users[j].data[k].duration += parseInt(data[i].duration,0);

									users[j].data[k].durationsArr.push(parseInt(data[i].duration,0));
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
									if(users[j].data[k].exerciseDays.indexOf(users[j].data[k].plays[l].startDate) == -1){
										users[j].data[k].exerciseDays.push(users[j].data[k].plays[l].startDate);
									}
								}

								//lets find smallest and largest startDate to get active week
								var d = new Date();
								//days 1-31 & months 0-11
								d.setDate(parseInt(data[i].startDate.substring(0,2),0));
								d.setMonth(parseInt(data[i].startDate.substring(3,5),0)-1);

								if($scope.smallestDate === undefined || d < $scope.smallestDate ){
									$scope.smallestDate = d;
								}

								if($scope.largestDate === undefined || d > $scope.largestDate){
									$scope.largestDate = d;
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
						if(users[i].overall.exerciseDays.indexOf(users[i].data[j].plays[k].startDate) == -1){
							users[i].overall.exerciseDays.push(users[i].data[j].plays[k].startDate);
						}

					}
				}
			}
			$scope.users = users;
			$scope.loadingShowing = false;
			//console.log($scope.users);
		};

	}])

	.controller('ModalInstanceController', function($scope, $modalInstance, items, $rootScope){

		$rootScope.modalUser = items;

		$scope.close = function(){
			$modalInstance.dismiss('close');
		};

	});


})();
