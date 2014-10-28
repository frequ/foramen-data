(function(){

  angular.module('chartsCtrl', ['ui.bootstrap'])


  .controller('ChartsController', function($scope, $rootScope){

    var user = $rootScope.modalUser;
    $scope.chartError = false;

    var gameLabels = [], data = [];
    var y, i;
    var colors = ['#7E8C8D', '#BEC3C7', '#E84C3D', '#E77E23', '#F1C40F', '#34495E', '#9B58B5', '#3598DB', '#2ECD71', '#1BBC9B'];

    for(i = 0; i < user.data.length; i++){
      gameLabels.push(user.data[i].game);

      y = Math.round((user.overall.durationsArr[i]/user.overall.duration)*100);
      if(isNaN(y)){
        $scope.chartError = true;
        return;
      }
      data.push({
        'x': user.data[i].game,
        'y': [y],
        'tooltip': 'Harjoitteessa '+user.data[i].game+' harjoitteluaika '+y+'%'
        });

    }

    console.log('series', gameLabels);
    console.log('data', data);

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
