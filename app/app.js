(function(){
	"use strict";
	/*global $:false, jQuery:false */

	var app = angular.module('foramendata', ['ui.bootstrap','angularMoment', 'charts'])

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

	.controller('FileAPIController', ['$scope','$rootScope','dataFactory', function($scope, $rootScope, dataFactory){

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
							$rootScope.$broadcast('gotData', obj);
							dataFactory.setData(obj);
						};
					})(f);

				}else{
						//multiple files
						reader = new FileReader();
						reader.onload = (function(theFile){
							return function(e) {
								var res = JSON.parse(e.target.result);
								for(i = 0; i < res.length; i++){

									if (res[i].startDate) {
										res[i].weekNum = moment(res[i].startDate, ['ddd MMM DD YYYY HH:mm:ss', 'DD.MM.YYYY']).week();
									}else{
										res[i].weekNum = 'Unknown week';
									}

								}

								tmp.push(res);
								if(files.length <= num){

									var data = [];
									angular.forEach(tmp, function(values){
										data = data.concat(values);
									});

									$rootScope.$broadcast('gotData', data);
									dataFactory.setData(data);
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

	.controller('DataController', ['$scope','$http', '$anchorScroll', '$q', '$modal', '$rootScope', '$log', 'dataFactory',
		function($scope, $http, $anchorScroll, $q, $modal, $rootScope, $log, dataFactory){

		//defaults
		$scope.userRoleFilter = ['Kuntoutuja'];
		$scope.groupComparison = false;

		//filtering with one model&button:
		//filter attribute & targetGroup boolean
		$scope.filterModel = ['Kuntoutuja',false];
		$scope.instructors = [];

		$scope.filterModelChanged = function(){

			if (!this.filterModel) {

				if($scope.previousFilterModel){
					this.filterModel = $scope.previousFilterModel;
				}else{
					this.filterModel = $scope.filterModel;
				}

			} else {
				$scope.previousFilterModel = this.filterModel;

				$scope.groupComparison = this.filterModel[this.filterModel.length-1];
				if (this.filterModel.length > 2) {
					$scope.userRoleFilter = [this.filterModel[0], this.filterModel[1]];
				}else{
					$scope.userRoleFilter = [this.filterModel[0]];
				}

			}

			$scope.render();
		};

		$scope.render = function(){
			var data = dataFactory.getData();
			if(data && data.length > 0){
				$rootScope.$broadcast('gotData', data);
			}
		};

		$scope.orderByField = 'game';
		$scope.orderGroupsByField = 'game';
		$scope.reverseSort = false;

		$scope.forceShowUnplayedGames = false;

		$scope.openModal = function (user, size) {

			$scope.user = user;

			var modalInstance = $modal.open({
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
				return parseInt(values[half]);
			}else{
				return parseInt((values[half-1] + values[half]) / 2);
			}

		};

		$scope.$on('gotData', function(event, obj){
			console.log('got data, starting parsing '+ obj.length + ' items');
			$scope.parsingStarted = moment();

			if ($scope.groupComparison){
				$scope.parseGroupData(obj);
			} else {
				$scope.parseUserData(obj);
			}

		});

		$scope.parsingFinished = function(data, identifier){

			if(identifier === 'users'){
				$scope.users = data;
			}else{
				$scope.groups = data;
			}

			$rootScope.loadingShowing = false;
			$('#data').css('display', 'block');

			if(!$scope.$$phase) {
				$scope.$apply();
			}

			var parsingFinished = moment();
			var parsingTookSeconds = parsingFinished.diff($scope.parsingStarted);
			$log.info('parsed data: '+identifier, data);
			$log.info('parsing data took '+ parsingTookSeconds+ ' ms');
		};

		$scope.createUser = function(name, group){

			var userObj = {
				"name": name,
				"group": group,
				"data": [],
				"overall": {
					duration: 0,
					durationsArr: [],
					levels: [0,0,0,0], //levels[playsonlevel1, playsonlevel2, playsonlevel3]
					totalPlays: 0,
					unfinished: 0,
					exerciseDays: [],
					durationMedian: 0
				}
			};

			userObj.data = $scope.createGameObjs();

			return userObj;
		};

		$scope.setDateRange = function(dateArr){

			_.each(dateArr, function(date){
				var myMoment = moment(date, 'DD.MM.YYYY');
				if($rootScope.smallestDate === undefined || myMoment.isBefore($rootScope.smallestDate)){
					$rootScope.smallestDate = myMoment;
				}
				if($rootScope.largestDate === undefined || myMoment.isAfter($rootScope.largestDate)){
					$rootScope.largestDate = myMoment;
				}
			});

		};

		$scope.createGameObjs = function(){
			var gameObjs = [];

			var games = ['Muista näkemäsi numerosarja','Jätkänshakki','Sudoku',
				'Tunnista sanat','Päättele salasana','Muista viesti','Rakenna kuvio mallista',
				'Muista näkemäsi esineet','Etsi kuvat',	'Muista kuulemasi sanat'];

			function createGameObj(gameName) {
				var gameDataObj = {
					game: gameName,
					plays: [],
					levels: [0,0,0,0], //levels[playsonlevel1, playsonlevel2, playsonlevel3, playsonjoker]
					unfinished: 0,
					duration: 0,
					finishedPercentage: 0,
					durationsArr: [],
					exerciseDays: [],
					durationMedian: 0
				};

				return gameDataObj;
			}

			for(var gameIndex = 0, len = games.length; gameIndex < len; gameIndex++){
				var gameObj = createGameObj(games[gameIndex]);
				gameObjs.push( gameObj );
			}

			return gameObjs;

		}

		$scope.handleDuration = function(play){

			var returnDuration = 0;
			if(play.duration === null){
				if(play.startDate && play.endDate){
					var start = moment(play.startDate, ['ddd MMM DD YYYY HH:mm:ss', 'DD.MM.YYYY']);
					var end = moment(play.endDate, ['ddd MMM DD YYYY HH:mm:ss', 'DD.MM.YYYY']);
					returnDuration = parseInt(end.diff(start, 'seconds'));
				}
			}else{
				returnDuration = parseInt(play.duration);
			}

			return returnDuration;

		};

		$scope.createGroup = function(groupName){

			var groupObj = {
				"name": groupName,
				"members": [],
				"data": [],
				"overall": {
					totalPlays: 0,
					unfinished: 0,
					levels: [0,0,0,0],
					duration: 0,
					durationsArr: [],
					exerciseDays: []
				}
			};

			groupObj.data = $scope.createGameObjs();

			return groupObj;
		};

		$scope.handleScandicLettersInGameTitle = function(gameTitle){
			if (gameTitle == "Muista nakemasi numerosarja") {
				return "Muista näkemäsi numerosarja";
			}else if (gameTitle == "Muista nakemasi esineet") {
				return "Muista näkemäsi esineet";
			}else if (gameTitle == "Paattele salasana") {
				return "Päättele salasana";
			}else if (gameTitle == "Jatkanshakki"){
				return "Jätkänshakki";
			}else{
				return gameTitle;
			}
		};

		$scope.parseUserData = function(data){
			var users = [];
			$rootScope.smallestDate = undefined;
			$rootScope.largestDate = undefined;
			$log.info('started parsing userData', data.length);

			_.each(data, function(play){

				var user = $scope.createUser(play.playerName, play.groupName);
				if (_.findWhere(users, {'name': user.name}) === undefined) {
					users.push(user);
				}

			});

			_.each(data, function(play){
				_.each(users, function(user){

					//filter
					if (_.contains($scope.userRoleFilter, play.userRole)){

						if(play.playerName === user.name){
							_.each(user.data, function(gameData){

								//user statistics per game

								play.gameTitle = $scope.handleScandicLettersInGameTitle(play.gameTitle);
								if (play.gameTitle === gameData.game){

									//plays
									gameData.plays.push(play);

									//unfinished plays
									if(play.endDate.length === 0){
										gameData.unfinished++;
										user.overall.unfinished++;
									}

									//durations
									var duration = $scope.handleDuration(play);

									gameData.duration += duration;
									gameData.durationsArr.push(duration);
									user.overall.durationsArr.push(duration);

									//exerciseDays
									var momentDate = moment(play.startDate, ['ddd MMM DD YYYY HH:mm:ss', 'DD.MM.YYYY']).format('DD.MM.YYYY');
									if(_.contains(gameData.exerciseDays, momentDate) === false){
										gameData.exerciseDays.push(momentDate);
									}

									//levels
									if(play.difficulty === 'Taso I'){
										gameData.levels[0]++;
										user.overall.levels[0]++;
									}else if(play.difficulty === 'Taso II'){
										gameData.levels[1]++;
										user.overall.levels[1]++;
									}else if(play.difficulty === "Taso III"){
										gameData.levels[2]++;
										user.overall.levels[2]++;
									}else{
										gameData.levels[3]++;
										user.overall.levels[3]++;
									}
								}
							});
						}
					}
				});
			});

			//user statistics overall
			_.each(users, function(user){

				//overall duration
				user.overall.duration = _.reduce(user.overall.durationsArr, function(memo,num){
					return memo + num;
				},0);

				//overall duration median
				if (user.overall.durationsArr.length > 0) {
					user.overall.durationMedian = $scope.median(user.overall.durationsArr);
				}

				_.each(user.data, function(gameData){

					//duration median per game
					if (gameData.durationsArr.length > 0) {
						gameData.durationMedian = $scope.median(gameData.durationsArr);
					}

					//overall plays
					user.overall.totalPlays += gameData.plays.length;

					//overall exercisedays
					_.each(gameData.exerciseDays, function(exerciseDay){
						if(_.contains(user.overall.exerciseDays, exerciseDay) === false){
							user.overall.exerciseDays.push(exerciseDay);
						}
					});

					//find and set smallest and largest date
					$scope.setDateRange(user.overall.exerciseDays);

				});
			});

			$scope.parsingFinished(users, 'users');

		};


		$scope.parseGroupData = function(data){
			var groups = [];
			$rootScope.smallestDate = undefined;
			$rootScope.largestDate = undefined;
			$log.info('started parsing groupData', data.length);

			_.each(data, function(play){
				var group = $scope.createGroup(play.groupName);
				if (_.findWhere(groups, {'name': group.name}) === undefined) {
					groups.push(group);
				}
			});

			_.each(data, function(play){
				_.each(groups, function(group){

					//filter
					if (_.contains($scope.userRoleFilter, play.userRole)){

						if (play.groupName === group.name) {

							//group members
							if(_.contains(group.members, play.playerName) === false){
								group.members.push(play.playerName);
							}

							_.each(group.data, function(groupGameData){

								//group statistics per game
								play.gameTitle = $scope.handleScandicLettersInGameTitle(play.gameTitle);
								if (play.gameTitle === groupGameData.game) {

									//plays
									groupGameData.plays.push(play);

									//unfinished plays
									if(play.endDate.length === 0){
										groupGameData.unfinished++;
										group.overall.unfinished++;
									}

									//durations
									var duration = $scope.handleDuration(play);

									groupGameData.duration += duration;
									groupGameData.durationsArr.push(duration);
									group.overall.durationsArr.push(duration);

									//exerciseDays
									var momentDate = moment(play.startDate, ['ddd MMM DD YYYY HH:mm:ss', 'DD.MM.YYYY']).format('DD.MM.YYYY');
									if(_.contains(groupGameData.exerciseDays, momentDate) === false){
										groupGameData.exerciseDays.push(momentDate);
									}

									//levels
									if(play.difficulty === 'Taso I'){
										groupGameData.levels[0]++;
										group.overall.levels[0]++;
									}else if(play.difficulty === 'Taso II'){
										groupGameData.levels[1]++;
										group.overall.levels[1]++;
									}else if(play.difficulty === "Taso III"){
										groupGameData.levels[2]++;
										group.overall.levels[2]++;
									}else{
										groupGameData.levels[3]++;
										group.overall.levels[3]++;
									}

								}
							});
						}
					}
				});
			});

			//group statistics overall
			var playCountArr = [];
			_.each(groups, function(group){

				//overall duration
				group.overall.duration = _.reduce(group.overall.durationsArr, function(memo, num){
					return memo + num;
				},0);

				_.each(group.data, function(groupGameData){

					//overall plays
					group.overall.totalPlays += groupGameData.plays.length;

					//create array to figure out least and most plays per user in group
					_.each(groupGameData.plays, function(play){

						var duration = $scope.handleDuration(play);

						var obj = _.findWhere(playCountArr, {'name': play.playerName});
						if (obj === undefined) {

							var user = {
								name: play.playerName,
								duration: duration,
								exerciseCount: 1,
								group: play.groupName
							};
							playCountArr.push(user);

						}else{
							obj.duration += duration;
							obj.exerciseCount++;
						}

					});

					//overall exercisedays
					_.each(groupGameData.exerciseDays, function(exerciseDay){
						if(_.contains(group.overall.exerciseDays, exerciseDay) === false){
							group.overall.exerciseDays.push(exerciseDay);
						}
					});

					//find and set smallest and largest date
					$scope.setDateRange(group.overall.exerciseDays);

				});

				//most and least plays found and saved
				_.each(playCountArr, function(playCount){

					if (group.name === playCount.group) {

						if (group.leastTimePlayed === undefined || group.leastTimePlayed > playCount.duration) {
							group.leastTimePlayed = playCount.duration;
						}

						if (group.mostTimePlayed === undefined || group.mostTimePlayed < playCount.duration) {
							group.mostTimePlayed = playCount.duration;
						}

						if (group.leastPlays === undefined || group.leastPlays > playCount.exerciseCount) {
							group.leastPlays = playCount.exerciseCount;
						}

						if (group.mostPlays === undefined || group.mostPlays < playCount.exerciseCount) {
							group.mostPlays = playCount.exerciseCount;
						}

					}

				});

			});

			$scope.parsingFinished(groups, 'groups');

		};

	}])

	.controller('ModalInstanceController', function($scope, $modalInstance, items, dataFactory){

		dataFactory.setUser(items);

		$scope.close = function(){
			$modalInstance.dismiss('close');
		};

	})

	.factory('dataFactory', function(){
		var dataFactory = {};
		var data = {};
		var user = {};

		dataFactory.setUser = function(newUser){
			user = newUser;
		};

		dataFactory.getUser = function(){
			return user;
		};

		dataFactory.setData = function(newData){
			data = newData;
		};

		dataFactory.getData = function(){
			return data;
		};

		return dataFactory;

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

					var orientation;
					if(myElem.attr('id') === "bar-chart") {
						myElem.find('.ac-legend').remove();
						orientation = 'landscape';
					}else{
						orientation = 'portrait';
					}


					var html = $(myElem).html();

					PrintWithIframe(html, orientation);
				}

				function PrintWithIframe(data, orientation){

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
