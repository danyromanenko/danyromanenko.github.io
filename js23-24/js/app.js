requirejs.config({
   paths: {
   	  'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery'
    },
    shim: {
        'jquery': {
            exports: 'jquery'
        }
    }
});

require(['jquery', 'tmpl', 'model', 'view', 'controller'],
    
    function ($, tmpl, model, view, controller) {
        var firstToDoList = ['learn html', 'learn JS', 'make coffee'];
        var model = new model(firstToDoList);
        var view = new view(model);
        var controller = new controller(model, view);
    }          
    );