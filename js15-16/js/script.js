(function ($) {
    "use strict";

    $(function () {

        // По отправке формы заменить стандартный обработчик на загрузку данных через AJAX запрос
        $('.search-form form').on('submit', function (event) {

            $.ajax({

                url: "https://www.googleapis.com/customsearch/v1?q=" + encodeURIComponent(this.elements[0].value) + "&key=AIzaSyDQq5I1_jJG2eKE78NEUM8GCBRwgXRW0F4&cx=000283222127530457480:fcqttmqm5o0&callback=?",
                dataType: "jsonp",
                success: function (data) {
                    if (data === null) {
                        $('#results').html("Ошибка");
                    } else {
                        // Преобразовать шаблон в HTML и поместить его в DOM
                        var template = $('#search-response').html();
                        var html = tmpl(template, data);
                        $('#results').html(html);
                    }
                }
            });

            event.preventDefault();

        });
          
        //задание2
        
        function Human() {
            this.name = 'Danil';
            this.age = 21;
            this.sex = 'male';
            this.height = 183;
            this.weight = 75;
        };
        
        Worker.prototype = new Human();
        Student.prototype = new Human();
        
        function Worker() {
            this.job = 'bartender';
            this.salary = 5000;
            this.work = function() {
                alert('WORK HARD');
            };
        };
        
        function Student() {
            this.university = 'DonNUET';
            this.grants = 0;
            this.hobby = function() {
                alert('WATCH TV');
            };
        };
        
        var Worker = new Worker();
        var Student = new Student();
        
        console.log(Worker);
        console.log(Student);
        
        $(function () {
            Worker.work();
            Student.hobby();
        });
        
        
    });
})(jQuery);