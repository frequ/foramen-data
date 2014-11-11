(function(){

  angular.module('chartsCtrl', ['ui.bootstrap'])

  .controller('ChartsController', function($scope, $rootScope, $filter){

    $scope.showGameComparison = false;
    $scope.showPlayBars = true;

    var wholeData = $rootScope.wholeData;
    var user = $rootScope.modalUser;
    $scope.chartError = false;

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

    var dayLabels = [], weekData = [];

    //weekly/daily data bars
    for(i = 0; i < user.overall.exerciseDays.length; i++){
      dayLabels.push(user.overall.exerciseDays[i]);
    }

    var plays = [];
    for(i = 0; i < wholeData.length; i++){

      for( j = 0; j < dayLabels.length; j++){

        if(wholeData[i].startDate === dayLabels[j]){
          if(!plays[dayLabels[j]]){
            plays[dayLabels[j]] = 0;
          }
          plays[dayLabels[j]]++;
        }
      }
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
      weekData.push({
        'x': dayLabels[j],
        'y': [plays[dayLabels[j]]],
        'tooltip': dayLabels[j] + ' <br/> Yhteensä harjoiteltu ' + plays[dayLabels[j]] + ' kertaa'
      });

    }

    $scope.playBarsConfig = {
      title: 'Harjoittelijan '+ user.name +' harjoittelut ajanjaksolla '+ $filter('date')($rootScope.smallestDate, 'd.M') +
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
