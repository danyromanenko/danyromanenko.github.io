$(document).ready(function($) {
    

    $('.dropdown').hover(function(){
        
            var $subMenu = $(this);
            var $dropDown = $subMenu.children('.sub-menu');
            
            $dropDown.slideDown(200);   //-------dropdownmenu-plugin
        },
        
        function(){
            
            var $subMenu = $(this);
            var $dropDown = $subMenu.children('.sub-menu'); //----Приходиться дублировать, по другому не работает.Не знаю в чем косяк:(
            
            $dropDown.slideUp(200);
        
        });
    
    $('.my-slider').unslider();  //-------carousel-plugin

    $('select').niceSelect();  //---------select-plugin
    
    $('.jquery_box').labelauty(); //-------checkbox-plugin

});