//we'll use routes for this one, our app is "upvoter"
var app = angular
  .module("reddit", ['ui.router']);

app .config([
  '$stateProvider',
  '$urlRouterProvider', 
  function($stateProvider, $urlRouterProvider){
    $stateProvider
      .state ('home', {
        url: '/home',
        templateUrl: "/home.html",
        controller : "homeController",
        resolve : {
          postPromise: ["posts", function(posts){
            return posts.fetchAll();}]
        }
      })

      .state('posts', {
        url: '/posts/{id}',
        templateUrl: "/posts.html",
        controller : "postController",
        resolve : {
          post: ["$stateParams", "posts", function($stateParams, posts) {
            return posts.fetchOne($stateParams.id);
          }]
        }
      })

      .state('login', {
        url: '/login',
        templateUrl: '/login.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function($state, auth){
          if(auth.isLoggedIn()){
            $state.go('home');
          }
        }]
      })

      .state('register', {
        url: '/register',
        templateUrl: '/register.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function($state, auth){
          if(auth.isLoggedIn()){
            $state.go('home');
          }
        }]
      });

      $urlRouterProvider.otherwise('home');
  }
]);

app.factory('posts', ["$http", 'auth', function($http, auth){

  var object = {
    posts : [],
    fetchAll : function(){
        return $http.get("/posts").success(function(data){
            angular.copy(data, object.posts);
        });
    },
    
    fetchOne : function(id) {
        return $http.get("/posts/"+id).then(function(res){  return res.data; });
    },
    
    createPost : function(post) {
        return $http.post("/posts", post, 
            {headers: {Authorization: 'Bearer '+auth.getToken()}} ).success(function(data){
            object.posts.push(data);
        });
    },
    
    addComment : function(id, comment) {
        return $http.post("/posts/"+id+"/comments",comment, {headers: {Authorization: 'Bearer '+auth.getToken()}});
    }, 
 
    upvote : function(post){
        return $http.put("/posts/" + post._id + "/upvote", null ,
          {headers: {Authorization: 'Bearer '+auth.getToken()}})
          .success(function(data){
            post.upvotes += 1;
          });
    },

    downvote : function(post){
        return $http.put("/posts/" + post._id + "/downvote", null ,
          {headers: {Authorization: 'Bearer '+auth.getToken()}})
          .success(function(data){
            post.upvotes -= 1;
          });
    },

    downvoteComment : function(post, comment){
      return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/downvote", null ,
        {headers: {Authorization: 'Bearer '+auth.getToken()}})
        .success(function(data){
          comment.upvotes -= 1;
        });
    },

    upvoteComment : function(post, comment) {
      return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/upvote", null ,
        {headers: {Authorization: 'Bearer '+auth.getToken()}})
        .success(function(data){
          comment.upvotes += 1;
        });
    }
  };

  return object;

  }]);

app.factory('auth', ['$http', '$window', function($http, $window){
      var auth = {
      
      saveToken : function (token){
        $window.localStorage['reddit-token'] = token;
      },

      getToken : function(token) {
        return $window.localStorage['reddit-token'];
      },

      isLoggedIn : function() {
        var token = auth.getToken();

        if(token) {
          var payload = JSON.parse($window.atob(token.split('.')[1]));
          return payload.exp > Date.now() / 1000;
        } else {
          return false;
        }
      },

      currentUser : function() {
        if(auth.isLoggedIn()) {
          var token = auth.getToken();
          var payload = JSON.parse($window.atob(token.split('.')[1]));

          return payload.username;
        }
      },

      register : function(user) {
        return $http.post('/register', user).success(function(data){
          auth.saveToken(data.token);
        });
      },

      logIn : function(user) {
        return $http.post('/login', user).success(function(data){
          auth.saveToken(data.token);
        });
      },

      logOut : function() {
        $window.localStorage.removeItem('reddit-token');
      }
  };

  return auth;
}])


app.controller(
  "postController", 
  ["$scope", "posts", 'post', 'auth',
    function($scope, posts, post, auth){
      $scope.text = "";

      $scope.post = post;
      $scope.comments = post.comments;
      $scope.isLoggedIn = auth.isLoggedIn;

      $scope.addComment = function(){
        if (!$scope.text || $scope.text === ''){ return; }

        posts.addComment(post._id, {text: $scope.text, upvotes: 0})
          .success(function(comment) {
            $scope.comments.push(comment);
        });
        $scope.text = '';
      }
      $scope.increaseCommentUpvotes = function(comment){
        posts.upvoteComment(post, comment);
      }

      $scope.decreaseCommentUpvotes = function(comment) {
        posts.downvoteComment(post, comment);
      }
    }
  ]
);

app.controller(
  "homeController", 
  ["$scope", "posts", 'auth',
    function($scope, posts, auth){
      $scope.text = "";
      $scope.posts = posts.posts; 
      $scope.isLoggedIn = auth.isLoggedIn;
      $scope.addPost = function(){
        if (!$scope.text || $scope.text === ''){ return; }
        posts.createPost({text: $scope.text, upvotes: 0, comments: []});
        $scope.text = '';
      }

      $scope.increaseUpvotes = function(post){
        posts.upvote(post);
      }

      $scope.decreaseUpvotes = function(post) {
        posts.downvote(post);
      }
    }
  ]
);

app.controller('AuthCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth){
  $scope.user = {};

  $scope.register = function(){
    auth.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };

  $scope.logIn = function(){
    auth.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}])

app.controller('NavCtrl', [
'$scope',
'auth',
function($scope, auth){
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
}]);