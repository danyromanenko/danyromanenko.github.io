$(document).ready(function () {
	
    $('.tabs').lightTabs();

});

(function ($) {				
	
    jQuery.fn.lightTabs = function (options) {

		var createTabs = function (){
            
            var $tabs = $(this);
            var $contents = $tabs.find('> div > div');
            var $buttons = $tabs.find('> ul > li');
            
            i = 0;
			
			showPage = function (i) {
				$contents.hide();
				$contents.eq(i).show();
				$buttons.removeClass('active');
				$buttons.eq(i).addClass('active');
			};
								
			showPage(0);				
			
            $buttons.on('click', function () {
                showPage($(this).index());
            });
       };		
           return this.each(createTabs);
	};	
})(jQuery);