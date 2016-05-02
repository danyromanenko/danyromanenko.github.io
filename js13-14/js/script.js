'use strict';

//объявляем массив объектов с вопросами и ответами
var testData = [
{
    question: 'Вопрос №1',
    answer: ['Ответ №1', 'Ответ №2', 'Ответ №3'],
    check: ['true', 'false', 'false'],
    name: 'first'
},
{
    question: 'Вопрос №2',
    answer: ['Ответ №1', 'Ответ №2', 'Ответ №3'],
    check: ['false', 'true', 'false'],
    name: 'second'
},
{
    question: 'Вопрос №3',
    answer: ['Ответ №1', 'Ответ №2', 'Ответ №3'],
    check: ['false', 'false', 'true'],
    name: 'third'
}
];

//записываем массив объектов с вопросами и ответами в localStorage
localStorage.setItem('questionAnswer', JSON.stringify(testData));

$(function() {

var test = $('#test').html();

var content = localStorage.getItem('questionAnswer');
content = JSON.parse(content);

var page = tmpl(test, { //формируем тест с помощью шаблонизатора
	data: content
});

$('.show_test').click(function() { // выводим тест на экран по клику на кнопку
	$('.show_test').hide();
	$('.check').css("display", "block");
    $('.check').before(page);
});

$('.check').on('click', function() { //проверяем результаты по клику на кнопку
    var $result = true;
        $('.checkbox').each(function() {
        if ($(this).prop('checked') !=($(this).attr('value') == 'true')) {
    			$result = false;
                return false;
    		}
    });

$('.modal_text')[0].innerHTML = $result ? 'Ответы верные, тест пройден' : 'Ответы неверные, тест не пройден'; // записываем результат теста в модальное окно
$('.modal_window').css("display", "block").animate({opacity: 1}, 500); //показываем модальное окно
$('.overlay').show('slow'); //показываем фон

});

$('.modal_button').on('click', function(){
    $('.modal_window').animate({opacity: 0}, 500, function() {
        $(this).css("display", "none"); //убираем модальное окно
        $('.overlay').hide('slow'); //убираем фон
    })
    $('.checkbox').each(function() { //очищаем чекбоксы
        $(this).prop('checked', false);
    });
});

})