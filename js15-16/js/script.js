(function ($) {
    "use strict";

    $(function () {

        // По отправке формы заменить стандартный обработчик на загрузку данных через AJAX запрос
        $('.search-form form').on('submit', function (event) {
            var template = $('#search-response').html();
            var results = $('#results');
            
            $.ajax({

                url: "https://www.googleapis.com/customsearch/v1?q=" + encodeURIComponent(this.elements[0].value) + "&key=AIzaSyDQq5I1_jJG2eKE78NEUM8GCBRwgXRW0F4&cx=000283222127530457480:fcqttmqm5o0&callback=?",
                dataType: "jsonp",
                success: function (data) {
                    if (data === null) {
                        $('#results').html("Ошибка");
                    } else {
                        // Преобразовать шаблон в HTML и поместить его в DOM
                        var html = tmpl(template, data);
                        results.html(html);
                    }
                }
            });

            event.preventDefault();

        });
          
        //задание2
        
        function Human(attrs) {
            var attrs = attrs || {};

            this.name = attrs.name || 'John Doe';
            this.age = attrs.age || 0;
            this.gender = attrs.gender;
            this.tall = attrs.tall;
            this.weight = attrs.weight;
        }

        // Работник
        function Worker(attrs) {
            var attrs = attrs || {};

            // Вызов конструктора предка для инициализации свойств
            Human.apply(this, arguments);

            this.job = attrs.job || 'unemployed';
            this.profit = attrs.profit || 0;
        }

        Worker.prototype = Object.create(Human.prototype);
        Worker.prototype.constructor = Worker;
        Worker.prototype.work = function() {
            console.log(this.name + ' working now!');
        };

        // Студент
        function Student(attrs) {
            var attrs = attrs || {};

            // Вызов конструктора предка для инициализации свойств
            Human.apply(this, arguments);

            this.school = attrs.school;
            this.grants = attrs.grants || 0;
        }

        Student.prototype = Object.create(Human.prototype);
        Student.prototype.constructor = Student;
        Student.prototype.watchTV = function() {
            console.log(this.name + ' watch serial now!');
        };

        // Создание объектов
        var human = new Human();

        var worker = new Worker({
            name: 'Daniil',
            age: 21,
            tall: 183,
            weight: 75,
            job: 'bartender',
            profit: 5000
        });
        worker.work();

        var student = new Student({
            name: 'Danya',
            age: 17,
            school: 'DonNUET',
            grants: 500
        });
        student.watchTV();


        console.dir(human);
        console.dir(worker);
        console.dir(student);


    });
})(jQuery);