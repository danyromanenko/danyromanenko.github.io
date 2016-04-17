window.onload = function () {
    
    var timer = new Timer();
};

var Timer = function () {
    
    var that = this;
    
    var startButton = document.getElementById('start');
    var splitButton = document.getElementById('split');
    var resetButton = document.getElementById('reset');
    var labelHours = document.getElementById('hours');
    var labelMinutes = document.getElementById('minutes');
    var labelSeconds = document.getElementById('seconds');
    var labelMS = document.getElementById('milliseconds');
                                             

    var hoursTimezone = new Date(0).getHours();

    this.stops = 0;
    this.splits = 0;


    this.getHours = function () {
        return parseInt(document.getElementById('hours').innerHTML);
    };
    
    this.getMinutes = function () {
        return parseInt(document.getElementById('minutes').innerHTML);
    };
    
    this.getSeconds = function () {
        return parseInt(document.getElementById('seconds').innerHTML);
    };
    
    this.getMS = function () {
        return parseInt(document.getElementById('milliseconds').innerHTML);
    };

    this.formatted = function (num, length) {
        return ('00'.substring(0, length - 1) + num).substr(String(num).length - 1);
    };

    this.setTimer = function (time) {
        var date = new Date(time);
        var hours = this.formatted(date.getHours() - hoursTimezone, 2);
        var minutes = this.formatted(date.getMinutes(), 2);
        var seconds = this.formatted(date.getSeconds(), 2);
        var milliseconds = this.formatted(date.getMilliseconds(), 3);

        labelHours.innerHTML = hours;
        labelMinutes.innerHTML = minutes;
        labelSeconds.innerHTML = seconds;
        labelMS.innerHTML = milliseconds;
    };

    this.getTime = function () {
        return new Date(this.getMS() + this.getSeconds() * 1000 + this.getMinutes() * 1000 * 60 + this.getHours() * 1000 * 60 * 60).getTime();
    };

    this.start = function () {
        startButton.innerHTML = 'STOP';
        startButton.onclick = that.stop;
        that.lastTimeStamp = new Date().getTime();
        that.timer = setInterval(function () {
            var newTimeStamp = new Date().getTime();
            var toAdd = newTimeStamp - that.lastTimeStamp;
            var newTime = that.getTime() + toAdd;
            that.setTimer(newTime);
            that.lastTimeStamp = newTimeStamp;
        }, 1);
    };

    this.stop = function () {
        startButton.onclick = that.start;
        startButton.innerHTML = 'START';
        clearInterval(that.timer);
        that.addInfo('stop');
    };

    this.reset = function () {
        that.stop();
        that.setTimer(0);
        that.clearInfo();
    };

    this.split = function () {
        if (document.getElementById('start').innerHTML === 'STOP') {
            that.addInfo('split');
        }
    };

    this.addInfo = function (field) {
        var info = field + ' ' + (++this[field+ 's']) + ': ' + this.formatted(this.getHours(), 2)
            + '-' + this.formatted(this.getMinutes(), 2) + '-' + this.formatted (this.getSeconds(), 2)
            + '-' + this.formatted(this.getMS(), 3);
        var p = document.createElement('p');
        p.innerHTML = info;
        document.querySelector('.info').appendChild(p);
    };

    this.clearInfo = function () {
        var info = document.querySelectorAll('.info p');
        for (var i = 0; i < info.length; i++) {
            info[i].parentNode.removeChild(info[i]);
        }
        this.stops = 0;
        this.splits = 0;
    };

    startButton.onclick = this.start;
    splitButton.onclick = this.split;
    resetButton.onclick = this.reset;
};
