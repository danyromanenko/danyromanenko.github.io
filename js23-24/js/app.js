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

require(
    ['jquery',
    'tmpl',
     'model',
     'view',
     'controller'
    ],
    
    function ($, tmpl, model, view, controller) {
        var firstToDoList = ['learn html', 'learn JS', 'make coffee'];
        var model = new Model(firstToDoList);
        var view = new View(model);
        var controller = new Controller(model, view);    
    }

    
          
);