$(function() {

    var task = $('#task').html();
    var page;
    var taskData = [
        {
         title: 'Романенко Даниил Романович',
         content: ['https://scontent-waw1-1.xx.fbcdn.net/v/t1.0-9/12661818_1669788496632521_8373094109618045210_n.jpg?oh=0b542ac6057e50e6f651c68856556401&oe=57B97205']
        },
        
        {
	     title: 'Студент ваших замечательных курсов',
	     content: []        
        },

        {
         title: 'Хочу учить frontend, потому что: ',
         content: ['Мне это интересно, параллельно я занимаюсь веб-дизайном.', 'Надоело работать на низкооплачиваемой работе, которая мне не нравится.', 'У меня есть диплом экономиста, а как экономист я не очень:']
        },

        {
	     title: 'Мой контактный номер: ',
	     content: ['+380997597337']
        },

        {
	     title: 'Мои профили в соцcетях',
	     content: ['<a href="http://vk.com/r_c_p" target="_blank">VKONTAKTE</a>', '<a href="https://www.facebook.com/danil.romanenko.5" target="_blank">FACEBOOK</a>']
        }
    ];

    var page = tmpl(task, {
	data: taskData
    });

$('.second').click(function() {
	$('.carousel').css("display", "none");
	$('.second').css("display", "none");
	$('.first').css("display", "block");
	$('body').append(page)
});

$('.first').click(function() {
	$('.carousel').css("display", "block");
	$('.second').css("display", "block");
	$('.first').css("display", "none");
	$('.main').remove()
});

});
