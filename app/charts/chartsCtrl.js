(function(){

  angular.module('chartsCtrl', ['ui.bootstrap'])

  .controller('ChartsController', function($scope, $rootScope, $filter){

    $scope.showGameComparison = false;
    $scope.showPlayBars = false;
    $scope.showWeekPlayBars = true;

    var wholeData = $rootScope.wholeData;
    var user = $rootScope.modalUser;
    $scope.chartError = false;

    $scope.multiple = false;

    var gameLabels = [], data = [];
    var y, i, j;
    var colors = ['#E77E23', '#7E8C8D',  '#E84C3D',  '#F1C40F', '#34495E', '#9B58B5', '#3598DB', '#2ECD71', '#1BBC9B'];

    for(i = 0; i < user.data.length; i++){
      gameLabels.push(user.data[i].game);

      y = Math.round((user.data[i].duration/user.overall.duration)*100);
      if(isNaN(y)){
        $scope.chartError = true;
        return;
      }
      data.push({
        'x': user.data[i].game,
        'y': [y],
        'tooltip': user.data[i].game+' <br/> Harjoitteluaika '+y+'% <br/> Aikaa käytetty: '+ $filter('readableTime')(user.data[i].duration,1) +
                    ' <br/> Harjoitetta tehty: '+user.data[i].plays.length +'/'+user.overall.totalPlays
        });
    }

    var dayLabels = [], dayData = [];
    var weekLabels = [], weekData = [];

    //weekly/daily data bars
    for(i = 0; i < user.overall.exerciseDays.length; i++){
      dayLabels.push(user.overall.exerciseDays[i]);


    }

    var dayPlays = [];
    var parsedStartDate;
    for(i = 0; i < wholeData.length; i++){

      for( j = 0; j < dayLabels.length; j++){

        parsedStartDate = "";
        if(wholeData[i].startDate.length > 10){
          parsedStartDate = moment(wholeData[i].startDate).format("DD.MM.YYYY");
        }else{
          parsedStartDate = wholeData[i].startDate;
        }

        if(parsedStartDate === dayLabels[j] && wholeData[i].playerName === user.name){

          //check if multiple files/weeks
          if(!$scope.multiple && wholeData[i].weekNum){
            $scope.multiple = true;
          }

          if(!dayPlays[dayLabels[j]]){
            dayPlays[dayLabels[j]] = 0;
          }
          dayPlays[dayLabels[j]]++;
        }
      }
    }

    var weekPlays = [];
    if($scope.multiple){
      for(i = 0; i < wholeData.length; i++){

        if(weekLabels.indexOf('Viikko '+wholeData[i].weekNum) == -1){
          weekLabels.push('Viikko '+wholeData[i].weekNum);
        }

      }
      for(i = 0; i < wholeData.length; i++){

        if(user.name === wholeData[i].playerName){
          if(!weekPlays['Viikko '+wholeData[i].weekNum]){
            weekPlays['Viikko '+wholeData[i].weekNum] = 0;
          }
          weekPlays['Viikko '+wholeData[i].weekNum]++;
        }
      }
      for(i = 0; i < weekLabels.length; i++){
        if(!weekPlays[weekLabels[i]]){
          weekPlays[weekLabels[i]] = 0;
        }
      }

    }else{
      $scope.showPlayBars = true;
      $scope.showWeekPlayBars = false;
    }

    //sorting date strings
    dayLabels.sort(function(d1,d2){

      if( d1.substring(3,5) < d2.substring(3,5) || (d1.substring(3,5) == d2.substring(3,5) && d1.substring(0,2) < d2.substring(0,2))){
        return -1;
      }else if(d1.substring(3,5) > d2.substring(3,5) || (d1.substring(3,5) == d2.substring(3,5) && d1.substring(0,2) > d2.substring(0,2))){
        return 1;
      }else{
        return 0;
      }
    });

    for(j = 0; j < dayLabels.length; j++){
      dayData.push({
        'x': dayLabels[j],
        'y': [dayPlays[dayLabels[j]]],
        'tooltip': dayLabels[j] + ' <br/> Yhteensä harjoiteltu ' + dayPlays[dayLabels[j]] + ' kertaa'
      });
    }

    $scope.playBarsConfig = {
      title: 'Harjoittelijan '+ user.name +' harjoittelukerrat ajanjaksolla '+ $filter('date')($rootScope.smallestDate, 'd.M') +
        ' - '+$filter('date')($rootScope.largestDate, 'd.M.yyyy') + ' (yht. '+ dayLabels.length + ' harjoittelupäivää)',
      tooltips: true,
      labels: true,
      mouseover: function() {},
      mouseout: function() {},
      click: function() {},
      legend: {
        display: false,
        position: 'left'
      },
      isAnimate: true,
      colors: colors
    };

    $scope.playBarsData = {
      series: dayLabels,
      data: dayData
    };


    for(i = 0; i < weekLabels.length; i++){
      weekData.push({
        'x': weekLabels[i],
        'y': [weekPlays[weekLabels[i]]],
        'tooltip': weekLabels[i] + ' <br/> Yhteensä harjoiteltu '+weekPlays[weekLabels[i]]+ ' kertaa'
      });
    }

    $scope.weekPlayBarsConfig = {
      title: 'Harjoittelijan '+ user.name +' harjoittelukerrat ajanjaksolla '+ $filter('date')($rootScope.smallestDate, 'd.M') +
        ' - '+$filter('date')($rootScope.largestDate, 'd.M.yyyy') + ' (yht. '+ dayLabels.length + ' harjoittelupäivää)',
      tooltips: true,
      labels: true,
      mouseover: function() {},
      mouseout: function() {},
      click: function() {},
      legend: {
        display: false,
        position: 'left'
      },
      isAnimate: true,
      colors: colors
    };

    $scope.weekPlayBarsData = {
      series: weekLabels,
      data: weekData
    };


    $scope.gameComparisonConfig  = {
      title: 'Harjoittelijan '+ user.name + ' harjoitteluajan jakautuminen:',
      tooltips: true,
      labels: true,
      mouseover: function() {},
      mouseout: function() {},
      click: function() {},
      legend: {
        display: true,
        position: 'left'
      },
      isAnimate: true,
      colors: colors
    };

    $scope.gameComparisonData = {
      series: gameLabels,
      data: data
    };

  });

})();
