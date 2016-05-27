'use strict';

let questions = [
    {id: 'quest-1', name: 'Вопрос №1', answers: ['Ответ №1', 'Ответ №2', 'Ответ №3']},
    {id: 'quest-2', name: 'Вопрос №2', answers: ['Ответ №1', 'Ответ №2', 'Ответ №3']},
    {id: 'quest-3', name: 'Вопрос №3', answers: ['Ответ №1', 'Ответ №2', 'Ответ №3']}
];
let trueAnswers = {
    'quest-1': 0,
    'quest-2': 1,
    'quest-3': 2
};


//записываем массив объектов с вопросами и ответами в localStorage
localStorage.setItem('questions', JSON.stringify(questions));

$(function () {

    let test = $('#test').html();

    let content = localStorage.getItem('questions');
    content = JSON.parse(content);

    let page = tmpl(test, { //формируем тест с помощью шаблонизатора
	    questions: content
    });

$('.show_test').click(function() { // выводим тест на экран по клику на кнопку
	$('.show_test').hide();
	$('.check').css("display", "block");
    $('.check').before(page);
});

$('.check').on('click', function() { //проверяем результаты по клику на кнопку
    let $form = $('form')[0];
    let result = true;
    for (var j = 0; j < questions.length; j++){
				var questionIndex = parseInt($form[questions[j].id].value);
				var valid = trueAnswers[questions[j].id] === questionIndex;
        console.log(valid);
        if (!valid){
            result = false;
            break;
        }
    };

$('.modal_text')[0].innerHTML = result ? 'Ответы верные, тест пройден' : 'Ответы неверные, тест не пройден'; // записываем результат теста в модальное окно
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