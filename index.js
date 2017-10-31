/**
 * @name     MPreview.mobile.js
 * @desc     移动端图片预览插件，支持手势缩放，双击放大，缩小
 * @depend   QuoJS
 * @author   M.J
 * @date     2015-07-12
 * @URL      http://webjyh.com
 * @reutn    {MPreview}
 * @version  1.0.0
 * @license  MIT
 *
 * @PS If you have any questions, please don't look for me, I don't know anything. thank you.
 */
"use strict";
var MPreviewObj = new Function;
(function (win, $) {
    var transition,
        scaleReg = /scale(?:3d)?\(([^\)]+)\)/,
        translateReg = /translate(?:3d)?\(([^\)]+)\)/,
        config = {
            url: null,
            data: null,
            title: '【浏览】',
            params: {},
            wrap: 'body',
            direction: 'top',
            placeholder: 'data:image/gif;base64,R0lGODlhAQABAJH/AP///wAAAMDAwAAAACH5BAEAAAIALAAAAAABAAEAAAICVAEAOw==',
            init: null,
            close: null
        },
        innerHTML =
            '<div class="ui-MPreview-wrap">' +
            '   <div class="ui-MPreview-row">' +
            '       <div class="ui-MPreview-toolbar">' +
            '            <div class="ui-MPreview-back"><a href="javascript:;">〈</a></div>' +
            '            <div class="ui-MPreview-title">{{title}}</div>' +
            '            <div class="ui-MPreview-pages"><span class="ui-MPreview-currentPage">00</span>/<span class="ui-MPreview-countPage">00</span></div>' +
            '        </div>' +
            '        <div class="ui-MPreview-view">' +
            '            <div class="ui-MPreview-imgbox">' +
            '                <ul class="ui-MPreview-imglist"></ul>' +
            '            </div>' +
            '            <div class="ui-MPreview-loading"></div>' +
            '        </div>' +
            '   </div>' +
            '</div>';

    /**
     * @name      将默认配置和选项合并
     * @param     options     {Object}     默认用户的参数
     * @return    {Object}
     */
    var cover = function (options, defaults) {
        var i, options = options || {};
        for (i in defaults) {
            if (options[i] === undefined) options[i] = defaults[i];
        }
        return options;
    };

    /**
     * 判断设备支持 transitionend 的前缀
     */
    var whichTransitionEvent = function () {
        var t,
            el = document.createElement('div'),
            transitions = {
                'WebkitTransition': 'webkitTransitionEnd',
                'OTransition': 'oTransitionEnd',
                'MozTransition': 'transitionend',
                'transition': 'transitionend'
            };
        for (t in transitions) {
            if (el.style[t] !== undefined) {
                return transitions[t];
            }
        }
    };

    /**
     * @name      格式化当前页的数字
     * @param     val     {Number}     默认用户的参数
     * @return    {String}
     */
    var formatPage = function (val) {
        return val.toString().length < 2 ? '0' + val : val;
    };

    // 构造函数
    var MPreview = function (options) {
        return new MPreview.fn.init(options);
    };

    MPreview.fn = MPreview.prototype = {
        constructor: MPreview,
        init: function (options) {
            //用户配置项
            transition = whichTransitionEvent();
            this.config = cover(options, config);  // 默认配置项
            this.topics = {};                      // 存放订阅内容

            //init 载入之前执行的回调
            if (typeof this.config.init == 'function') this.config.init();

            // 载入订阅内容
            this._action();

            // init 组件默认配置
            this.publish('init')
                .publish('ajax')
                .publish('touch')
                .publish('zoom')
                .publish('resize');

            return this;
        },
        /**
         * @name    订阅发布
         * @type    {Function}
         * @parmas  {key}   订阅的名称
         * @params  {val}   订阅的内容
         * @return  this
         */
        subscribe: function (key, val) {
            if (!this.topics[key]) {
                this.topics[key] = [];
            }
            this.topics[key].push(val);
            return this;
        },

        /**
         * @name    退订发布
         * @type    {Function}
         * @params  {key}    要退订的名称
         * @return  this
         */
        unsubscribe: function (key) {
            if (this.topics[key]) {
                delete this.topics[key];
            }
            return this;
        },

        /**
         * @name    发布订阅的
         * @type    {Function}
         * @return  this
         */
        publish: function (key) {
            if (!this.topics[key]) {
                return false;
            }

            var subscribers = this.topics[key],
                len = subscribers ? subscribers.length : 0,
                args = [].slice.call(arguments);

            args.shift();
            for (var i = 0; i < len; i++) {
                subscribers[i].apply(this, args);
            }

            return this;
        },

        /**
         * 获取当前元素 CSS3 属性值
         * @param {Object} elem
         * @param {Object} name
         */
        getTransform: function (e, name) {
            e = $(e);

            var val = e.css("transform") || e.css("-webkit-transform"),
                has = val === 'none',
                arr, x, y, reg;

            if (name === 'translate') {
                reg = translateReg;
                if (has || val.indexOf(name) == -1) {
                    has = true;
                    x = y = 0;
                }
            } else if (name === "scale") {
                reg = scaleReg;
                if (has || val.indexOf(name) == -1) {
                    has = true;
                    x = y = 1;
                }
            }

            if (!has) {
                arr = val.match(reg);
                arr = arr[1].split(',');
                x = parseFloat(arr[0]);
                y = parseFloat(arr[1]);
            }

            return {
                x: x,
                y: y
            };
        },

        /**
         * @name    图片等比缩放
         * @param   size
         */
        scale: function (size) {
            if (!size.width || !size.height) {
                return {width: '100%', height: '100%'};
            }
            var r,
                w = size.width,
                h = size.height,
                screenW = parseInt(this.offset.width),
                screenH = parseInt(this.offset.height);

            // 图片宽大于屏幕宽
            if (w > screenW) {
                r = screenW / w;
                w = screenW;
                h = Math.floor(h * r);
            }

            // 图片高大于屏幕高
            if (h > screenH) {
                r = screenH / h;
                h = screenH;
                w = Math.floor(w * r);
            }

            return {
                width: w,
                height: h
            };
        },

        /**
         * @name   求两点之间中间点的坐标
         * @params  {a}  点A的坐标
         * @params  {b}  点B的坐标
         * @return  两点之间的距离
         */
        distance: function (a, b) {
            if (!a || !b) return;
            var x = (a.x + b.x) / 2,
                y = (a.y + b.y) / 2;
            return {x: x, y: y};
        },
        /**
         * @name     获取点阵位置
         * @params   {e}    events 事件对象
         * @params   {val}  缩放比  如果为空采用默认指
         * @return   Boolean || Object
         */
        getOrigin: function (e, val) {
            var touchX = val === undefined ? e.touch.x : this.distance(e.touch.touches[0], e.touch.touches[1]).x,    // 点击当前位置X
                touchY = val === undefined ? e.touch.y : this.distance(e.touch.touches[0], e.touch.touches[1]).y,    // 点击当前位置Y
                size = {
                    width: val === undefined ? this.size[this.index - 1].width : (parseInt($(e.target).css('width')) * val),
                    height: val === undefined ? this.size[this.index - 1].height : (parseInt($(e.target).css('height')) * val)
                },                  // 当前图片原大小
                currentSize = val === undefined ? (this.scale(size)) : ({
                    width: parseInt($(e.target).css('width')),
                    height: parseInt($(e.target).css('height')),
                }),    // 当前图片现大小
                screen = this.screen,
                scale = val || size.width / currentSize.width,  // 最大缩放比
                imgAreaX = (screen.width - currentSize.width) / 2,     // 图片与容器之间的留白区左边
                imgAreaY = (screen.height - currentSize.height) / 2,   // 图片与容器之间的留白区上边
                originX = touchX - imgAreaX,    //点阵位置X
                originY = touchY - imgAreaY,     //点阵位置Y
                fix, maxTx, minTx, maxTy, minTy;

            if (size.width <= parseInt(this.offset.width, 10) && size.height <= parseInt(this.offset.height, 10)) {
                scale = 2;
                fix = size.width - currentSize.width;
                maxTx = (fix * (originX / currentSize.width) - imgAreaX) / scale;
                minTx = 0 - (fix * ((currentSize.width - originX) / currentSize.width) - imgAreaX) / scale;
                if (maxTx < 0) {
                    maxTx = 0;
                    originX = imgAreaX / fix * currentSize.width;
                    minTx = 0 - (fix * ((currentSize.width - originX) / currentSize.width) - imgAreaX) / scale;
                }
                if (minTx > 0) {
                    minTx = 0;
                    originX = currentSize.width - imgAreaX / fix * currentSize.width;
                    maxTx = (fix * (imgAreaX / currentSize.width)) / scale;
                }
            }

            // 图片的宽是否大于当前屏幕宽
            if (size.width > screen.width) {
                fix = size.width - currentSize.width;
                maxTx = (fix * (originX / currentSize.width) - imgAreaX) / scale;
                minTx = 0 - (fix * ((currentSize.width - originX) / currentSize.width) - imgAreaX) / scale;
                if (maxTx < 0) {
                    maxTx = 0;
                    originX = imgAreaX / fix * currentSize.width;
                    minTx = 0 - (fix * ((currentSize.width - originX) / currentSize.width) - imgAreaX) / scale;
                }
                if (minTx > 0) {
                    minTx = 0;
                    originX = currentSize.width - imgAreaX / fix * currentSize.width;
                    maxTx = (fix * (imgAreaX / currentSize.width)) / scale;
                }
            } else {
                originX = currentSize.width / 2;
            }

            // 图片的高是否大于当前屏幕高
            if (size.height > screen.height) {
                fix = size.height - currentSize.height;
                maxTy = (fix * (originY / currentSize.height) - imgAreaY) / scale;
                minTy = 0 - (fix * ((currentSize.height - originY) / currentSize.height) - imgAreaY) / scale;
                if (maxTy < 0) {
                    maxTy = 0;
                    originY = imgAreaY / fix * currentSize.height;
                    minTy = 0 - (fix * ((currentSize.height - originY) / currentSize.height) - imgAreaY) / scale;
                }
                if (minTy > 0) {
                    minTy = 0;
                    originY = currentSize.height - imgAreaY / fix * currentSize.height;
                    maxTy = (fix * (originY / currentSize.height) - imgAreaY) / scale;
                }
            } else {
                originY = currentSize.height / 2;
            }

            return {
                scale: scale,
                x: originX + 'px',
                y: originY + 'px',
                scope: {
                    maxTx: maxTx,
                    minTx: minTx,
                    maxTy: maxTy,
                    minTy: minTy
                }
            };
        },

        /**
         * @name    关闭销毁程序
         * @return  null;
         */
        destroy: function () {
            var has;
            if (typeof this.config.close == 'function') has = this.config.close();
            if (has === false) return;

            // 清空HTML
            $(this.config.wrap).empty();
            $(this.config.wrap).removeAttr('style');
            $(document).off('touchmove');
            $(window).off(this.resizeType);

        },

        /**
         * @name    配置订阅内容
         * @params  null
         * @return  this
         */
        _action: function () {

            // 设置配置项
            this.subscribe('init', function () {
                var _this = this,
                    css = 'width: 100%; height: 100%; overflow: hidden; background: #000';

                this.data = null;       //请求所获取的数据
                this.DOM = null;        //当前组件的DOM元素
                this.index = 1;         //当前所在第几页
                this.size = {};         //对应的图片大小
                this.isExec = false;    //当前动画是否执行完成
                this.touch = null;      //存储最近一次Touch的属性
                this.isScroll = false;  //标识是否为当前滚动状态
                this.isScale = false;   //当前图片是否放大中
                this.isZoom = false;    //标识是否是双指滚动中的事件
                this.imgMoveData = null;  //图片放大移动时缩放的值
                this.zoomInertia = null;  // 双指缩放值以及点阵位置
                this.zoomRecord = 1;      // 记录每次缩放后的缩放值，默认为1，
                this.screen = {
                    width: window.innerWidth,
                    height: window.innerHeight
                };
                this.resizeType = typeof window.orientation == 'number' ? 'orientationchange' : 'resize';  //支持旋转的事件名
                this.config.direction = this.config.direction == 'left' ? true : false;   //滚动方向，true 横屏幕滚动，false 竖屏滚动

                $(_this.config.wrap)[0].style.cssText = css;
                $(document).on('touchmove', function (e) {
                    e.preventDefault();
                });
            });

            // 创建DOM
            this.subscribe('init', function () {
                var elems, DOM = {},
                    html = innerHTML.replace('{{title}}', this.config.title),
                    elem = $(this.config.wrap),
                    screen = this.screen;

                elem.html(html);
                elems = elem.find('*');
                elems.each(function (i, v) {
                    if (v.className.indexOf('ui-MPreview-') > -1) {
                        var key = v.className.replace('ui-MPreview-', '');
                        DOM[key] = $(v);
                    }
                });

                var h = parseInt(DOM.toolbar.style('height'), 10);
                DOM.wrap.style('width', screen.width + 'px');
                DOM.wrap.style('height', screen.height + 'px');
                DOM.view.style('height', (screen.height - h) + 'px');
                DOM.view.style('top', h + 'px');

                // 当前容器宽高
                this.offset = {
                    width: DOM.view.style('width'),
                    height: DOM.view.style('height')
                };
                this.DOM = DOM;
            });

            // 绑定返回事件
            this.subscribe('init', function () {
                var _this = this;
                this.DOM.back.on('touch', function (e) {
                    e.preventDefault();
                    _this.destroy();
                });
            });

            // 加载图片，并对应设置Key
            this.subscribe('load', function (val, key, callback) {
                var _this = this,
                    load = function (size) {
                        if (!_this.size[key]) _this.size[key] = size;
                        callback && callback.call(_this, size);
                        setTimeout(function () {
                            _this.DOM.loading.addClass('ui-MPreview-hide');
                        }, 100);
                    };
                $.each(val, function (i, v) {
                    _this.DOM.loading.removeClass('ui-MPreview-hide');
                    var img = new Image();
                    img.src = v;
                    if (img.complete) {
                        load({width: img.width, height: img.height});
                    } else {
                        img.onload = function () {
                            load({width: img.width, height: img.height});
                            img.onload = null;
                        };
                    }
                });
            });

            // Ajax 请求
            this.subscribe('ajax', function () {
                if (!this.config.data && !this.config.url) return;

                var _this = this,
                    callback = function (data) {
                        this.data = data.imgs;
                        this.publish('load', [data.imgs[0]], 0, function (size) {
                            this.publish('append', size)
                                .publish('setPage')
                                .publish('preloading', 'next');
                        });
                    };

                // 判断是否为自己添加数据
                if (this.config.data && this.config.data.length) {
                    callback.call(this, {imgs: this.config.data});
                    return;
                }

                // 无自己数据则发送Ajax请求
                $.ajax({
                    url: this.config.url,
                    data: this.config.params,
                    dataType: 'json',
                    success: function (data) {
                        if (data.code > 0 && data.imgs && data.imgs.length) {
                            callback.call(_this, data);
                        }
                    },
                    error: function () {
                        alert('获取数据失败');
                    }
                });
            });

            // 创建数据DOM
            this.subscribe('append', function (size) {
                var temp = '',
                    DOM = this.DOM,
                    tpl = '<li data-index="{{index}}" style="width: ' + this.offset.width + '; height: ' + this.offset.height + ';"><img src="{{src}}" style="width: {{width}}; height: {{height}};" /></li>',
                    len = this.data.length > 2 ? 3 : this.data.length;

                size = this.scale(size);
                for (var i = 0; i < len; i++) {
                    var src = (i === 0) ? this.data[i] : this.config.placeholder,
                        w = (i === 0) ? size.width + 'px' : '100%',
                        h = (i === 0) ? size.height + 'px' : '100%';
                    temp += tpl.replace('{{index}}', i)
                        .replace('{{src}}', src)
                        .replace('{{width}}', w)
                        .replace('{{height}}', h);
                }

                DOM.imglist.html(temp);
                DOM.imglist.style(this.config.direction ? 'width' : 'height', parseInt(this.offset[this.config.direction ? 'width' : 'height'], 10) * len + 'px');
                DOM.imglist.vendor('transform-origin', '50% 50% 0px');
                DOM.imgbox.addClass('ui-MPreview-show');
                DOM.loading.addClass('ui-MPreview-hide');
            });

            //设置总分页值
            this.subscribe('append', function () {
                this.DOM.countPage.text(formatPage(this.data.length));
            });

            // 设置分页值
            this.subscribe('setPage', function () {
                this.DOM.currentPage.text(formatPage(this.index));
            });

            // 预加载
            this.subscribe('preloading', function (val, callback) {
                var li = document.createElement('li'),
                    _this = this,
                    DOM = this.DOM,
                    index = val == 'next' ? (this.index + 1) : (this.index - 1),
                    append = function (elem, src, key) {
                        _this.publish('load', [src], key, function (size) {
                            size = _this.scale(size);
                            elem.html('<img src="' + src + '" style="width: ' + size.width + 'px; height: ' + size.height + 'px" />');
                            callback && callback();
                        });
                    };

                // 检测是否预加载到达最小值或最大值
                index--;
                li.style.width = _this.offset.width;
                li.style.height = _this.offset.height;

                if (index < 0 || index > (this.data.length - 1))  return;
                if (val == 'prev' && this.index == (this.data.length - 1)) return;

                // 为第一页所预加载只重构 img;
                if (val == 'next' && _this.index < 3) {
                    append($(DOM.imglist.find('li').get(_this.index)), this.data[index], index);
                    return;
                }

                // 图片预加载处理
                li.setAttribute('data-index', index);
                DOM.imglist.find('li')[val == 'next' ? 'first' : 'last']().remove();
                DOM.imglist[val == 'next' ? 'append' : 'prepend'](li);
                append($(li), this.data[index], index);
            });

            // 设置滑动操作
            this.subscribe('touchStyle', function (duration, x, y, timing) {
                var DOM = this.DOM.imglist;
                duration = duration || 0;
                x = x || 0;
                y = y || 0;
                DOM.vendor('transition', '-webkit-transform ' + duration + 'ms ' + timing + ' 0s');
                DOM.vendor('transform', 'translate3d(' + x + 'px, ' + y + 'px, 0px)');
            });

            // 屏幕滚动
            this.subscribe('touch', function () {
                var startTx, startTy, direction, has,
                    _this = this,
                    w = parseInt(_this.offset.width, 10),
                    h = parseInt(_this.offset.height, 10),
                    minTx = parseInt(parseInt(this.offset.width) / 3, 10),
                    minTy = parseInt(parseInt(this.offset.height) / 3, 10),
                    DOM = this.DOM,
                    callback = function () {
                        _this.isScroll = false;
                        _this.isExec = false;
                        if (has) {
                            _this.publish('preloading', direction ? 'next' : 'prev');
                            var diff = ((_this.index - 1) * (_this.config.direction ? w : h)) - (_this.config.direction ? w : h);
                            if (_this.index == 1) diff = 0;
                            if (_this.index == _this.data.length) diff = diff - (_this.config.direction ? w : h);
                            DOM.imglist.style(_this.config.direction ? 'left' : 'top', diff < 0 ? '0px' : diff + 'px');
                        }
                    };

                DOM.imgbox.on('touchstart', function (e) {
                    e.preventDefault();
                    if (_this.isExec || _this.isScale || e.touches.length > 1) return;
                    startTx = e.touches[0].clientX;
                    startTy = e.touches[0].clientY;
                });

                DOM.imgbox.on('touchmove', function (e) {
                    e.preventDefault();
                    if (_this.isExec || _this.isScale || e.touches.length > 1) return;

                    //标识是否滚动
                    var diff = Math.abs(_this.config.direction ? (e.touches[0].clientX - startTx) : (e.touches[0].clientY - startTy));
                    if (e.touches.length === 1 && diff > 20) {
                        _this.isScroll = true;
                    }

                    var scroll,
                        touches = e.touches[0],
                        currentTx = touches.clientX,
                        currentTy = touches.clientY,
                        fix = _this.index > 1 ? (_this.index - 1) * parseInt(_this.config.direction ? _this.offset.width : _this.offset.height, 10) : 0;

                    // 判断滑动方向  true上滑（下一页），false 下滑(上一页)
                    if (_this.config.direction) {
                        direction = startTx - currentTx > 0 ? true : false;
                    } else {
                        direction = startTy - currentTy > 0 ? true : false;
                    }

                    // 回滚操作
                    var diffs = Math.abs(_this.config.direction ? (startTx - currentTx) : (startTy - currentTy));
                    if (!direction && _this.index == 1) {
                        scroll = diffs;
                    } else {
                        scroll = direction ? -(diffs + fix) : -(fix - diffs);
                    }

                    if (_this.config.direction) {
                        _this.publish('touchStyle', 0, scroll, 0, 'ease');
                    } else {
                        _this.publish('touchStyle', 0, 0, scroll, 'ease');
                    }
                });

                DOM.imgbox.on('touchend', function (e) {
                    e.preventDefault();
                    if (_this.isExec || _this.isScale || e.touches.length > 1) return;

                    var touches = e.changedTouches[0],
                        endTx = touches.clientX,
                        endTy = touches.clientY;

                    // 设置当前页数
                    _this.isExec = true;
                    has = _this.config.direction ? (Math.abs(startTx - endTx) > minTx ) : (Math.abs(startTy - endTy) > minTy);

                    if (has) {
                        direction ? (_this.index++) : (_this.index--);
                    }
                    if (_this.index > _this.data.length) _this.index = _this.data.length;
                    if (_this.index < 1) _this.index = 1;

                    // 当前滚动操作
                    var scroll = -(_this.index - 1) * (_this.config.direction ? w : h);
                    if (_this.config.direction) {
                        _this.publish('touchStyle', 300, scroll, 0, 'ease-out');
                    } else {
                        _this.publish('touchStyle', 300, 0, scroll, 'ease-out');
                    }
                    if (has) _this.publish('setPage');
                });

                // CSS3 动画事件回调
                DOM.imgbox.on(transition, callback);

            });

            // 卸载图片滚动
            this.subscribe('untouch', function () {
                var DOM = this.DOM;
                DOM.imgbox.off('touchstart');
                DOM.imgbox.off('touchmove');
                DOM.imgbox.off('touchend');
                DOM.imgbox.off(transition);
            });

            // 图片放大事件
            this.subscribe('zoom', function () {
                var DOM = this.DOM,
                    _this = this;

                // 双击图片放大，缩小
                DOM.imglist.on('doubleTap', 'li', function (e) {
                    _this.publish(_this.isScale ? 'zoomOut' : 'zoomIn', e);
                });

                // 缩放 缩小结束
                DOM.imglist.on('pinchIn', 'img', function (e) {
                    e.preventDefault();

                    if (_this.isScroll) return;
                    var $elem = $(e.target);
                    $elem.off('touchstart');
                    $elem.off('touchmove');

                    // 缩放最小值
                    if (_this.zoomInertia.scale <= 1) {
                        _this.isScale = false;
                        $elem.vendor('transition', '-webkit-transform 300ms ease 0s');
                        $elem.vendor('transform-origin', _this.zoomInertia.x + ' ' + _this.zoomInertia.y + ' 0px');
                        $elem.vendor('transform', 'scale3d(1, 1, 1)');
                    } else {
                        if (_this.zoomInertia.scope) {
                            $elem.on('touchstart', function (event) {
                                _this.publish('imgTouchStart', event, this);
                            });
                            $elem.on('touchmove', function (event) {
                                _this.publish('imgTouchMove', event, this, _this.zoomInertia.scope);
                            });
                        }
                    }

                    _this.publish('zoomRecord', e.target);
                });

                // 缩放中
                DOM.imglist.on('pinching', 'img', function (e) {
                    e.preventDefault();
                    if (_this.isScroll) return;
                    _this.publish('zoomInertia', e);
                });

                //缩放放大结束
                DOM.imglist.on('pinchOut', 'img', function (e) {
                    e.preventDefault();

                    if (_this.isScroll) return;
                    var $elem = $(e.target);
                    $elem.off('touchstart');
                    $elem.off('touchmove');

                    if (_this.zoomInertia.scope) {
                        $elem.on('touchstart', function (event) {
                            _this.publish('imgTouchStart', event, this);
                        });
                        $elem.on('touchmove', function (event) {
                            _this.publish('imgTouchMove', event, this, _this.zoomInertia.scope);
                        });
                    }

                    _this.publish('zoomRecord', e.target);
                });

                //判断是否完成缩放结束，即两手指离开屏幕
                DOM.imglist.on('touchend', 'img', function (e) {
                    if (!e.touches.length && !_this.isScale && _this.isZoom) {
                        _this.isZoom = false;
                        _this.isExec = false;
                        // 修正因直接绑定而导致重复触发 touchend 事件
                        setTimeout(function () {
                            _this.publish('touch');
                        }, 10);
                    }
                });

            });

            //记录上一次 zoom 缩放的值
            this.subscribe('zoomRecord', function (elem) {
                this.zoomRecord = this.getTransform(elem, 'scale').x;
            });

            // 双击图片放大
            this.subscribe('zoomIn', function (e) {
                var _this = this,
                    $elem = e.target.nodeName === 'IMG' ? $(e.target) : $(e.target).find('img').first(),
                    origin = this.getOrigin(e);
                console.log(origin)
                if (!origin) return;

                _this.isZoom = true;      // 标识当前是双指滚动中的事件
                this.publish('untouch');  // 卸载图片滚动事件
                //放大时图片Touch事件的绑定
                this.isScale = true;    // 标识图片已放大，禁用上下翻页功能
                $elem.on('touchstart', function (event) {
                    _this.publish('imgTouchStart', event, this);
                });
                $elem.on('touchmove', function (event) {
                    _this.publish('imgTouchMove', event, this, origin.scope);
                });

                //设置样式
                $elem.vendor('transform-origin', origin.x + ' ' + origin.y + ' 0px');
                $elem.vendor('transition', '-webkit-transform 300ms ease-out 0s');
                $elem.vendor('transform', 'scale3d(' + origin.scale + ', ' + origin.scale + ', 1)');

                //设置记录值
                this.publish('zoomRecord', $elem[0]);
            });

            // 双击图片缩小
            this.subscribe('zoomOut', function (e) {
                var $elem = e.target.nodeName !== 'IMG' ? $(e.target).find('img').first() : $(e.target),
                    origin = $elem.css('transform-origin') || $elem.css('-webkit-transform-origin');

                this.isScale = false;      // 标识图片是否放大
                this.isZoom = false;      // 标识当前是双指滚动中的事件

                $elem.off('touchstart');
                $elem.off('touchmove');
                $elem.vendor('transform-origin', origin);
                $elem.vendor('transition', '-webkit-transform 300ms ease-out 0s');
                $elem.vendor('transform', 'scale3d(1, 1, 1)');

                this.publish('touch');
                this.publish('zoomRecord', $elem[0]);
            });

            // 图片缩放中
            this.subscribe('zoomInertia', function (e) {
                e.preventDefault();
                var scale, nScale,
                    fix,
                    $elem = $(e.target),
                    delta = e.touch.delta,          // 双指滚动的差值
                    w = parseInt($elem.css('width'), 10),
                    defaultWidth = w * this.zoomRecord,   //当前图片的宽度
                    imgWidth = this.size[this.index - 1].width,  // 图片原宽度
                    maxZoom = imgWidth / w;

                if (delta === 0) return;

                //双指滚动的差值 / 默认图片的宽度，等于当前图片大小放大了多少倍数，
                //在乘以  图片原宽度，则得出相当于在原图上放大了多少像素
                //然后就是当前图片宽度 + 得出原图的像素， 除以 当前图的宽度，得出放大的倍数

                if (!this.isScale) {
                    this.isScale = true;            // 标识是否已放大
                    this.isZoom = true;             // 标识当前是双指滚动中的事件
                    this.publish('untouch');         // 卸载图片滚动事件
                }

                if (delta > 0) {
                    fix = delta / defaultWidth * imgWidth;
                    scale = Math.abs(1 - ((defaultWidth + fix) / defaultWidth));
                    nScale = this.zoomRecord + scale;
                } else {
                    fix = delta / w * defaultWidth;
                    scale = Math.abs(1 - ((w + fix) / w));
                    nScale = this.zoomRecord - scale;
                }

                if (nScale < 0.5) nScale = 0.5;
                if (nScale > maxZoom) nScale = maxZoom;
                this.zoomInertia = this.getOrigin(e, nScale);
                if (!this.zoomInertia) {
                    this.zoomInertia = {
                        scale: nScale,
                        x: '50%',
                        y: '50%'
                    };
                }
                //记录图片放大后要移动图片的值
                this.imgMoveData = {
                    scale: {x: nScale, y: nScale},
                    client: {
                        x: e.touch.touches[0].x,
                        y: e.touch.touches[0].y
                    }
                };

                $elem.vendor('transition', '-webkit-transform 0ms ease 0s');
                $elem.vendor('transform-origin', this.zoomInertia.x + ' ' + this.zoomInertia.y + ' 0px');
                $elem.vendor('transform', 'scale3d(' + nScale + ', ' + nScale + ', 1)');
            });

            // 图片放大移动开始
            this.subscribe('imgTouchStart', function (e, elem) {
                var scale = this.getTransform(elem, 'scale'),
                    touch = e.touches[0];
                this.imgMoveData = {
                    scale: scale,
                    client: {
                        x: touch.clientX,
                        y: touch.clientY
                    }
                };
                $(elem).vendor('transition', '-webkit-transform 0ms ease 0s');
            });

            // 图片放大移动中
            this.subscribe('imgTouchMove', function (e, elem, area) {
                e.preventDefault();

                var translate = this.getTransform(elem, 'translate'),
                    $elem = $(elem),
                    move = this.imgMoveData,                          // 在移动时所记录的图像值
                    touch = e.touches,
                    clientX = touch[0].clientX,                        // 当前Tap的位置 X轴、
                    clientY = touch[0].clientY,                        // 当前Tap的位置 Y轴、
                    x = (clientX - move.client.x) / move.scale.x,      // 将移动的差值按比例减小 X轴
                    y = (clientY - move.client.y) / move.scale.y;      // 将移动的差值按比例减小 Y轴

                if (touch.length > 1 || move.scale.x === undefined || move.scale.y === undefined) {
                    return;
                }
                //更新最新坐标
                this.imgMoveData.client.x = touch[0].clientX;
                this.imgMoveData.client.y = touch[0].clientY;

                // X轴最大最小值检测
                if (area.maxTx !== undefined && area.minTx !== undefined) {
                    translate.x += x;    // 在原有的 translate 更新每一次偏移量
                    if (translate.x > area.maxTx) {
                        translate.x = area.maxTx;
                    } else {
                        if (translate.x < area.minTx) {
                            translate.x = area.minTx;
                        }
                    }
                }

                // Y轴最大最小值检测
                if (area.maxTy !== undefined && area.minTy !== undefined) {
                    translate.y += y;   // 在原有的 translate 更新每一次偏移量
                    if (translate.y > area.maxTy) {
                        translate.y = area.maxTy;
                    } else {
                        if (translate.y < area.minTy) {
                            translate.y = area.minTy;
                        }
                    }
                }

                $elem.vendor('transform', 'scale3d(' + move.scale.x + ', ' + move.scale.y + ', 1) translate3d(' + translate.x + 'px, ' + translate.y + 'px, 0px)');
            });

            // Resize
            this.subscribe('resize', function () {
                var c, DOM = this.DOM,
                    _this = this;

                var resize = function () {
                    _this.screen = {
                        width: window.innerWidth,
                        height: window.innerHeight
                    };
                    _this.isExec = false;
                    _this.isZoom = false;
                    _this.isScroll = false;
                    _this.isScale = false;

                    var h = parseInt(DOM.toolbar.style('height'), 10),
                        width = _this.screen.width,
                        height = _this.screen.height,
                        he = height - h,
                        diff = ((_this.index - 1) * (_this.config.direction ? width : he)) - (_this.config.direction ? width : he),
                        scroll = -(_this.index - 1) * (_this.config.direction ? width : he);

                    if (_this.index == 1) diff = 0;
                    if (_this.index == _this.data.length) diff = diff - (_this.config.direction ? width : he);

                    _this.offset = {
                        width: width + 'px',
                        height: he + 'px'
                    };

                    DOM.wrap[0].style.cssText = 'width: ' + width + 'px; height: ' + height + 'px;';
                    DOM.view[0].style.cssText = 'top: ' + h + 'px; height: ' + he + 'px;';
                    DOM.imglist.find('li').each(function (i, elem) {
                        var $img = $(elem).find('img'),
                            index = parseInt($(elem).attr('data-index'), 10),
                            size = _this.size[index] && _this.scale(_this.size[index]);

                        elem.style.cssText = 'width:' + _this.offset.width + '; height: ' + _this.offset.height + ';';
                        size && ($img[0].style.cssText = 'width: ' + size.width + 'px; height: ' + size.height + 'px;');
                        $img.vendor('transform-origin', '50% 50% 0px');
                        $img.vendor('transition', '-webkit-transform 0ms ease 0s');
                        $img.vendor('transform', 'scale3d(1, 1, 1) translate3d(0px, 0px, 0px);');
                        $img.off('touchstart');
                        $img.off('touchmove');
                    });
                    DOM.imglist.css(_this.config.direction ? 'left' : 'top', diff < 0 ? '0px' : diff + 'px');
                    DOM.imglist.css(_this.config.direction ? 'width' : 'height', (_this.config.direction ? width : he) * (_this.data.length > 2 ? 3 : _this.data.length) + 'px');

                    // 重新绑定滚动翻页事件
                    if (_this.config.direction) {
                        _this.publish('touchStyle', 0, scroll, 0, 'ease');
                    } else {
                        _this.publish('touchStyle', 0, 0, scroll, 'ease');
                    }
                    _this.publish('untouch').publish('touch');
                };

                //横屏，竖屏切换
                $(window).on(_this.resizeType, function () {
                    clearTimeout(c);
                    c = setTimeout(resize, 300);
                });

            });

            return this;
        }
    };

    MPreview.fn.init.prototype = MPreview.fn;

    // 扩展至全局
    // win.MPreview = MPreview;
    MPreviewObj = MPreview;
    //追加样式
    var styles = document.createElement("style");
    styles.innerHTML = '.ui-MPreview-wrap{background:#000;overflow:hidden;-webkit-tap-highlight-color:rgba(0,0,0,0);position:absolute;width:100%;height:100%;left:0;top:0;font-family:"Microsoft YaHei", Airal, sans-serif;visibility:visible;z-index:10000;-webkit-text-size-adjust:none;-moz-text-size-adjust:none;-ms-text-size-adjust:none;text-size-adjust:none}.ui-MPreview-row{background:#333;color:#ccc;height:100%;left:0;position:absolute;top:0;width:100%;z-index:2}.ui-MPreview-toolbar{-webkit-backface-visibility:hidden;backface-visibility:hidden;background:#333;height:40px;left:0;line-height:40px;position:absolute;text-shadow:1px 1px 0 rgba(0,0,0,0.4);top:0;-webkit-transition-duration:.3s;transition-duration:.3s;-webkit-transition-property:-webkit-transform,opacity;transition-property:transform,opacity;-webkit-transition-timing-function:ease-in;transition-timing-function:ease-in;width:100%;z-index:5}.ui-MPreview-back{height:40px;line-height:40px;left:0;position:absolute;top:0;width:40px}.ui-MPreview-back > a{display:block;width:100%;height:100%;text-align:center;color:#FFF;text-decoration:none;text-indent:-8px}.ui-MPreview-back a:active{background-color:#000}.ui-MPreview-title{font-size:14px;font-weight:700;height:40px;left:50px;overflow:hidden;position:absolute;right:50px;text-align:center;text-overflow:ellipsis;top:0;white-space:nowrap;z-index:2;color:#DDD}.ui-MPreview-pages{display:inline;font-size:13px;height:40px;position:absolute;right:0;text-align:center;top:0;color:#ddd;width:40px}.ui-MPreview-view{background:#000;-webkit-tap-highlight-color:rgba(0,0,0,0);z-index:1;-webkit-user-select:none}.ui-MPreview-view,.ui-MPreview-imgbox{height:100%;overflow:hidden;position:absolute;width:100%}.ui-MPreview-loading{background:url(data:image/gif;base64,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) no-repeat 0 0;background-size:24px;height:24px;left:50%;margin:-12px 0 0 -12px;opacity:.3;position:absolute;top:50%;width:24px;z-index:1}.ui-MPreview-imgbox{display:none;z-index:2}.ui-MPreview-imgbox .ui-MPreview-imglist{height:100%;overflow:hidden;position:absolute;z-index:1;margin:0;padding:0;list-style:none;-webkit-transition:translate3d(0px, 0, 0);-moz-transform:translate3d(0px, 0, 0);transform:translate3d(0px, 0, 0)}.ui-MPreview-imgbox .ui-MPreview-imglist li{display:inline-block;overflow:hidden;text-align:center;vertical-align:top;list-style:none}.ui-MPreview-imgbox .ui-MPreview-imglist li:before{content:"";display:inline-block;height:100%;vertical-align:middle}.ui-MPreview-imgbox .ui-MPreview-imglist li img{vertical-align:middle;background:transparent;}.ui-MPreview-hide{display:none}.ui-MPreview-show{display:block}';
    document.head.appendChild(styles);
}(window, (function () {
    var _this = {};
    (function () {
        var t,
            n = [].indexOf || function (t) {
                    for (var n = 0, e = this.length; e > n; n++)
                        if (n in this && this[n] === t)
                            return n;
                    return -1
                };
        t = function () {
            var t, n, e, r, i, u, o, a, c, l, s, f, h, d, p, v, g;
            return r = [],
                a = Object.prototype,
                o = /^\s*<(\w+|!)[^>]*>/,
                e = [1, 9, 11],
                n = /^\.([\w-]+)$/,
                u =/^#[\w\d-]+$/, s = /^[\w-]+$/,
                c = document.createElement("table"),
                l = document.createElement("tr"),
                i = {
                    tr: document.createElement("tbody"),
                    tbody: c,
                    thead: c,
                    tfoot: c,
                    td: l,
                    th: l,
                    "*": document.createElement("div")
                },
                t = function (n, e) {
                    var r;
                    return n ? "function" === t.toType(n) ? t(document).ready(n) : (r = p(n, e), v(r, n)) : v()
                },
                t.query = function (t, e) {
                    var r;
                    return n.test(e) ? r = t.getElementsByClassName(e.replace(".", "")) : s.test(e) ? r = t.getElementsByTagName(
                        e) : u.test(e) && t === document ? (r = t.getElementById(e.replace("#", "")), r || (r = [])) : r = t.querySelectorAll(
                        e), r.nodeType ? [r] : Array.prototype.slice.call(r)
                },
                t.extend = function (t) {
                    return Array.prototype.slice.call(arguments, 1).forEach(function (n) {
                        var e, r;
                        r = [];
                        for (e in n) r.push(t[e] = n[e]);
                        return r
                    }), t
                },
                t.toType = function (t) {
                    var n;
                    return n = a.toString.call(t).match(/\s([a-z|A-Z]+)/), n.length > 1 ? n[1].toLowerCase() : "object"
                },
                t.each = function (n, e) {
                    var r, i, u, o, a;
                    if (i = void 0, o = void 0, "array" === t.toType(n)) for (i = u = 0, a = n.length; a > u; i = ++u) r = n[i],
                    e.call(r, i, r) === !1;
                    else for (o in n) e.call(n[o], o, n[o]) === !1;
                    return n
                },
                t.map = function (n, e) {
                    var r, i, u, o;
                    if (o = [], r = void 0, i = void 0, "array" === t.toType(n)) for (r = 0; r < n.length;) u = e(n[r], r),
                    null != u && o.push(u), r++;
                    else for (i in n) u = e(n[i], i), null != u && o.push(u);
                    return h(o)
                },
                t.mix = function () {
                    var t, n, e, r, i;
                    for (e = {}, t = 0, r = arguments.length; r > t;) {
                        n = arguments[t];
                        for (i in n) g(n, i) && void 0 !== n[i] && (e[i] = n[i]);
                        t++
                    }
                    return e
                },
                v = function (t, n) {
                    return null == n && (n = ""), t = t || r, t.selector = n, t.__proto__ = v.prototype, t
                },
                p = function (n, r) {
                    var i, u;
                    return i = null, u = t.toType(n), "array" === u ? i = f(n) : "string" === u && o.test(n) ? (i = d(n.trim(),
                        RegExp.$1), n = null) : "string" === u ? (i = t.query(document, n), r && (i = 1 === i.length ? t.query(
                        i[0], r) : t.map(function () {
                        return t.query(i, r)
                    }))) : (e.indexOf(n.nodeType) >= 0 || n === window) && (i = [n], n = null), i
                },
                d = function (n, e) {
                    var r;
                    return null == e && (e = "*"), e in i || (e = "*"), r = i[e], r.innerHTML = "" + n, t.each(Array.prototype.slice
                        .call(r.childNodes), function () {
                        return r.removeChild(this)
                    })
                },
                f = function (t) {
                    return t.filter(function (t) {
                        return null != t ? t : void 0
                    })
                },
                h = function (t) {
                    return t.length > 0 ? r.concat.apply(r, t) : t
                },
                g = function (t, n) {
                    return a.hasOwnProperty.call(t, n)
                },
                v.prototype = t.fn = {},
                t.fn.each = function (t) {
                    return this.forEach(function (n, e) {
                        return t.call(n, e, n)
                    }), this
                },
                t.fn.filter = function (n) {
                    return t(r.filter.call(this, function (e) {
                        return e.parentNode && t.query(e.parentNode, n).indexOf(e) >= 0
                    }))
                },
                t.fn.forEach = r.forEach,
                t.fn.indexOf = r.indexOf,
                t.version = "3.0.7",
                t
        }(),
            this.Quo = this.$$ = t,
            // "undefined" != typeof module &&
            // null !== module &&
            // (module.exports = t),
            function (t) {
                var n, e, r, i, u, o, a, c, l, s, f, h;
                return n = {
                    TYPE: "GET",
                    MIME: "json"
                }, r = {
                    script: "text/javascript, application/javascript",
                    json: "application/json",
                    xml: "application/xml, text/xml",
                    html: "text/html",
                    text: "text/plain"
                }, e = 0, t.ajaxSettings = {
                    type: n.TYPE,
                    async: !0,
                    success: {},
                    error: {},
                    context: null,
                    dataType: n.MIME,
                    headers: {},
                    xhr: function () {
                        return new window.XMLHttpRequest
                    },
                    crossDomain: !1,
                    timeout: 0
                }, t.ajax = function (e) {
                    var r, o, c, f;
                    if (c = t.mix(t.ajaxSettings, e), c.type === n.TYPE ? c.url += t.serialize(c.data, "?") : c.data = t.serialize(
                            c.data), i(c.url)) return u(c);
                    f = c.xhr(), f.onreadystatechange = function () {
                        return 4 === f.readyState ? (clearTimeout(r), s(f, c)) : void 0
                    }, f.open(c.type, c.url, c.async), l(f, c), c.timeout > 0 && (r = setTimeout(function () {
                        return h(f, c)
                    }, c.timeout));
                    try {
                        f.send(c.data)
                    } catch (d) {
                        o = d, f = o, a("Resource not found", f, c)
                    }
                    return f
                }, t.get = function (n, e, r, i) {
                    return t.ajax({
                        url: n,
                        data: e,
                        success: r,
                        dataType: i
                    })
                }, t.post = function (t, n, e, r) {
                    return c("POST", t, n, e, r)
                }, t.put = function (t, n, e, r) {
                    return c("PUT", t, n, e, r)
                }, t["delete"] = function (t, n, e, r) {
                    return c("DELETE", t, n, e, r)
                }, t.json = function (n, e, r) {
                    return t.ajax({
                        url: n,
                        data: e,
                        success: r
                    })
                }, t.serialize = function (t, n) {
                    var e, r;
                    null == n && (n = ""), r = n;
                    for (e in t) t.hasOwnProperty(e) && (r !== n && (r += "&"), r += encodeURIComponent(e) + "=" +
                        encodeURIComponent(t[e]));
                    return r === n ? "" : r
                }, u = function (n) {
                    var r, i, u, o;
                    return n.async ? (i = "jsonp" + ++e, u = document.createElement("script"), o = {
                        abort: function () {
                            return t(u).remove(), i in window ? window[i] = {} : void 0
                        }
                    }, r = void 0, window[i] = function (e) {
                        return clearTimeout(r), t(u).remove(), delete window[i], f(e, o, n)
                    }, u.src = n.url.replace(RegExp("=\\?"), "=" + i), t("head").append(u), n.timeout > 0 && (r = setTimeout(function () {
                        return h(o, n)
                    }, n.timeout)), o) : console.error("QuoJS.ajax: Unable to make jsonp synchronous call.")
                }, s = function (t, n) {
                    t.status >= 200 && t.status < 300 || 0 === t.status ? n.async && f(o(t, n), t, n) : a(
                        "QuoJS.ajax: Unsuccesful request", t, n)
                }, f = function (t, n, e) {
                    e.success.call(e.context, t, n)
                }, a = function (t, n, e) {
                    e.error.call(e.context, t, n, e)
                }, l = function (t, n) {
                    var e;
                    n.contentType && (n.headers["Content-Type"] = n.contentType), n.dataType && (n.headers.Accept = r[n.dataType]);
                    for (e in n.headers) t.setRequestHeader(e, n.headers[e])
                }, h = function (t, n) {
                    t.onreadystatechange = {}, t.abort(), a("QuoJS.ajax: Timeout exceeded", t, n)
                }, c = function (n, e, r, i, u) {
                    return t.ajax({
                        type: n,
                        url: e,
                        data: r,
                        success: i,
                        dataType: u,
                        contentType: "application/x-www-form-urlencoded"
                    })
                }, i = function (t) {
                    return RegExp("=\\?").test(t)
                }, o = function (t, e) {
                    var r, i;
                    if (i = t, t.responseText) {
                        if (e.dataType === n.MIME) try {
                            i = JSON.parse(t.responseText)
                        } catch (u) {
                            r = u, i = r, a("QuoJS.ajax: Parse Error", t, e)
                        }
                        "xml" === e.dataType && (i = t.responseXML)
                    }
                    return i
                }
            }(t),
            function (t) {
                var n, e, r;
                return n = ["-webkit-", "-moz-", "-ms-", "-o-", ""], t.fn.addClass = function (t) {
                    return this.each(function () {
                        var n, r, i, u, o;
                        for (i = e(t), u = [], n = 0, r = i.length; r > n; n++) o = i[n], u.push(this.classList.add(o));
                        return u
                    })
                }, t.fn.removeClass = function (t) {
                    return this.each(function () {
                        var n, r, i, u, o;
                        for (i = e(t), u = [], n = 0, r = i.length; r > n; n++) o = i[n], u.push(this.classList.remove(o));
                        return u
                    })
                }, t.fn.toggleClass = function (t) {
                    return this.each(function () {
                        var n, r, i, u, o;
                        for (i = e(t), u = [], n = 0, r = i.length; r > n; n++) o = i[n], u.push(this.classList.toggle(o));
                        return u
                    })
                }, t.fn.hasClass = function (t) {
                    return this.length > 0 && this[0].classList.contains(t)
                }, t.fn.listClass = function () {
                    return this.length > 0 ? this[0].classList : void 0
                }, t.fn.style = t.fn.css = function (t, n) {
                    var e;
                    return null != n ? this.each(function () {
                        return this.style[t] = n
                    }) : (e = this[0], e.style[t] || r(e, t))
                }, t.fn.vendor = function (t, e) {
                    var r, i, u, o;
                    for (o = [], r = 0, i = n.length; i > r; r++) u = n[r], o.push(this.style("" + u + t, e));
                    return o
                }, r = function (t, n) {
                    return document.defaultView.getComputedStyle(t, "")[n]
                }, e = function (t) {
                    return Array.isArray(t) || (t = [t]), t
                }
            }(t),
            function (t) {
                return t.fn.attr = function (n, e) {
                    return this.length > 0 && "string" === t.toType(n) ? null != e ? this.each(function () {
                        return this.setAttribute(n, e)
                    }) : this[0].getAttribute(n) : void 0
                }, t.fn.removeAttr = function (n) {
                    return this.length > 0 && "string" === t.toType(n) ? this.each(function () {
                        return this.removeAttribute(n)
                    }) : void 0
                }, t.fn.data = function (t, n) {
                    return this.attr("data-" + t, n)
                }, t.fn.removeData = function (t) {
                    return this.removeAttr("data-" + t)
                }, t.fn.val = function (t) {
                    return null != t ? this.each(function () {
                        return this.value = t.toString()
                    }) : this.length > 0 ? this[0].value : null
                }, t.fn.show = function () {
                    return this.style("display", "block")
                }, t.fn.hide = function () {
                    return this.style("display", "none")
                }, t.fn.focus = function () {
                    return this[0].focus()
                }, t.fn.blur = function () {
                    return this[0].blur()
                }, t.fn.offset = function () {
                    var t, n;
                    return this.length > 0 && (t = this[0].getBoundingClientRect(), n = {
                        left: t.left + window.pageXOffset,
                        top: t.top + window.pageYOffset,
                        width: t.width,
                        height: t.height
                    }), n
                }
            }(t),
            function (t) {
                var n, e, r, i, u, o;
                return r = null, n = /WebKit\/([\d.]+)/, e = {
                    Android: /(Android)\s+([\d.]+)/,
                    ipad: /(iPad).*OS\s([\d_]+)/,
                    iphone: /(iPhone\sOS)\s([\d_]+)/,
                    Blackberry: /(BlackBerry|BB10|Playbook).*Version\/([\d.]+)/,
                    FirefoxOS: /(Mozilla).*Mobile[^\/]*\/([\d\.]*)/,
                    webOS: /(webOS|hpwOS)[\s\/]([\d.]+)/
                }, t.isMobile = function () {
                    return this.environment(), r.isMobile
                }, t.environment = function () {
                    var t, n;
                    return r || (n = navigator.userAgent, t = u(n), r = {
                        browser: i(n),
                        isMobile: !! t,
                        screen: o(),
                        os: t
                    }), r
                }, i = function (t) {
                    var e;
                    return e = t.match(n), e ? e[0] : t
                }, u = function (t) {
                    var n, r, i;
                    for (r in e) if (i = t.match(e[r])) {
                        n = {
                            name: "iphone" === r || "ipad" === r || "ipod" === r ? "ios" : r,
                            version: i[2].replace("_", ".")
                        };
                        break
                    }
                    return n
                }, o = function () {
                    return {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                }
            }(t),
            function (t) {
                var n, e, r, i, u, o, a, c, l, s, f, h, d;
                return n = 1, i = {}, r = {
                    preventDefault: "isDefaultPrevented",
                    stopImmediatePropagation: "isImmediatePropagationStopped",
                    stopPropagation: "isPropagationStopped"
                }, e = {
                    touchstart: "mousedown",
                    touchmove: "mousemove",
                    touchend: "mouseup",
                    touch: "click",
                    orientationchange: "resize"
                }, u = /complete|loaded|interactive/, t.fn.on = function (n, e, r) {
                    return null == e || "function" === t.toType(e) ? this.bind(n, e) : this.delegate(e, n, r)
                }, t.fn.off = function (n, e, r) {
                    return null == e || "function" === t.toType(e) ? this.unbind(n, e) : this.undelegate(e, n, r)
                }, t.fn.ready = function (n) {
                    return u.test(document.readyState) ? n.call(this, t) : t.fn.addEvent(document, "DOMContentLoaded", function () {
                        return n.call(this, t)
                    })
                }, t.fn.bind = function (t, n) {
                    return this.forEach(function (e) {
                        return h(e, t, n)
                    })
                }, t.fn.unbind = function (t, n) {
                    return this.each(function () {
                        return d(this, t, n)
                    })
                }, t.fn.delegate = function (n, e, r) {
                    return this.each(function (i, u) {
                        return h(u, e, r, n, function (e) {
                            return function (r) {
                                var i, a;
                                return a = t(r.target).closest(n, u).get(0), a ? (i = t.extend(o(r), {
                                    currentTarget: a,
                                    liveFired: u
                                }), e.apply(a, [i].concat([].slice.call(arguments, 1)))) : void 0
                            }
                        })
                    })
                }, t.fn.undelegate = function (t, n, e) {
                    return this.each(function () {
                        return d(this, n, e, t)
                    })
                }, t.fn.trigger = function (n, e, r) {
                    return "string" === t.toType(n) && (n = l(n, e)), null != r && (n.originalEvent = r), this.each(function () {
                        return this.dispatchEvent(n)
                    })
                }, t.fn.addEvent = function (t, n, e) {
                    return t.addEventListener ? t.addEventListener(n, e, !1) : t.attachEvent ? t.attachEvent("on" + n, e) : t[
                    "on" + n] = e
                }, t.fn.removeEvent = function (t, n, e) {
                    return t.removeEventListener ? t.removeEventListener(n, e, !1) : t.detachEvent ? t.detachEvent("on" + n, e) :
                        t["on" + n] = null
                }, l = function (t, n) {
                    var e;
                    return e = document.createEvent("Events"), e.initEvent(t, !0, !0, null, null, null, null, null, null, null,
                        null, null, null, null, null), n && (e.touch = n), e
                }, h = function (n, e, r, u, o) {
                    var l, s, h, d;
                    return e = c(e), h = f(n), s = i[h] || (i[h] = []), l = o && o(r, e), d = {
                        event: e,
                        callback: r,
                        selector: u,
                        proxy: a(l, r, n),
                        delegate: l,
                        index: s.length
                    }, s.push(d), t.fn.addEvent(n, d.event, d.proxy)
                }, d = function (n, e, r, u) {
                    var o;
                    return e = c(e), o = f(n), s(o, e, r, u).forEach(function (e) {
                        return delete i[o][e.index], t.fn.removeEvent(n, e.event, e.proxy)
                    })
                }, f = function (t) {
                    return t._id || (t._id = n++)
                }, c = function (n) {
                    var r;
                    return r = ("function" == typeof t.isMobile ? t.isMobile() : void 0) ? n : e[n], r || n
                }, a = function (t, n, e) {
                    var r;
                    return n = t || n, r = function (t) {
                        var r;
                        return r = n.apply(e, [t].concat(t.data)), r === !1 && t.preventDefault(), r
                    }
                }, s = function (t, n, e, r) {
                    return (i[t] || []).filter(function (t) {
                        return !(!t || n && t.event !== n || e && t.callback !== e || r && t.selector !== r)
                    })
                }, o = function (n) {
                    var e;
                    return e = t.extend({
                        originalEvent: n
                    }, n), t.each(r, function (t, r) {
                        return e[t] = function () {
                            return this[r] = function () {
                                return !0
                            }, n[t].apply(n, arguments)
                        }, e[r] = function () {
                            return !1
                        }
                    }), e
                }
            }(t),
            function (t) {
                return t.fn.text = function (t) {
                    return null != t ? this.each(function () {
                        return this.textContent = t
                    }) : this.length > 0 ? this[0].textContent : ""
                }, t.fn.html = function (n) {
                    var e;
                    return null != n ? (e = t.toType(n), this.each(function () {
                        return "string" === e ? this.innerHTML = n : "array" === e ? n.forEach(function (n) {
                            return function (e) {
                                return t(n).html(e)
                            }
                        }(this)) : this.innerHTML += t(n).html()
                    })) : this.length > 0 ? this[0].innerHTML : ""
                }, t.fn.remove = function () {
                    return this.each(function () {
                        return null != this.parentNode ? this.parentNode.removeChild(this) : void 0
                    })
                }, t.fn.empty = function () {
                    return this.each(function () {
                        return this.innerHTML = null
                    })
                }, t.fn.append = function (n) {
                    var e;
                    return e = t.toType(n), this.each(function () {
                        return "string" === e ? this.insertAdjacentHTML("beforeend", n) : "array" === e ? n.forEach(function (n) {
                            return function (e) {
                                return t(n).append(e)
                            }
                        }(this)) : this.appendChild(n)
                    })
                }, t.fn.prepend = function (n) {
                    var e;
                    return e = t.toType(n), this.each(function () {
                        return "string" === e ? this.insertAdjacentHTML("afterbegin", n) : "array" === e ? n.each(function (t) {
                            return function (n, e) {
                                return t.insertBefore(e, t.firstChild)
                            }
                        }(this)) : this.insertBefore(n, this.firstChild)
                    })
                }, t.fn.replaceWith = function (n) {
                    var e;
                    return e = t.toType(n), this.each(function () {
                        return this.parentNode ? "string" === e ? this.insertAdjacentHTML("beforeBegin", n) : "array" === e ? n
                            .each(function (t) {
                                return function (n, e) {
                                    return t.parentNode.insertBefore(e, t)
                                }
                            }(this)) : this.parentNode.insertBefore(n, this) : void 0
                    }), this.remove()
                }
            }(t),
            function (n) {
                var e, r, i, u;
                return e = "parentNode", n.fn.find = function (e) {
                    var r;
                    return r = 1 === this.length ? t.query(this[0], e) : this.map(function () {
                        return t.query(this, e)
                    }), n(r)
                }, n.fn.parent = function (t) {
                    var n;
                    return n = t ? i(this) : this.instance(e), r(n, t)
                }, n.fn.children = function (t) {
                    var n;
                    return n = this.map(function () {
                        return Array.prototype.slice.call(this.children)
                    }), r(n, t)
                }, n.fn.siblings = function (t) {
                    var n;
                    return n = this.map(function (t, n) {
                        return Array.prototype.slice.call(n.parentNode.children).filter(function (t) {
                            return t !== n
                        })
                    }), r(n, t)
                }, n.fn.get = function (t) {
                    return this[t] || null
                }, n.fn.first = function () {
                    return n(this[0])
                }, n.fn.last = function () {
                    return n(this[this.length - 1])
                }, n.fn.closest = function (t, e) {
                    var r, i;
                    for (i = this[0], r = n(t), r.length || (i = null); i && r.indexOf(i) < 0;) i = i !== e && i !== document &&
                        i.parentNode;
                    return n(i)
                }, n.fn.next = function () {
                    return u.call(this, "nextSibling")
                }, n.fn.prev = function () {
                    return u.call(this, "previousSibling")
                }, n.fn.instance = function (t) {
                    return this.map(function () {
                        return this[t]
                    })
                }, n.fn.map = function (t) {
                    return n.map(this, function (n, e) {
                        return t.call(n, e, n)
                    })
                }, i = function (t) {
                    var e;
                    for (e = []; t.length > 0;) t = n.map(t, function (t) {
                        return t = t.parentNode, t !== document && e.indexOf(t) < 0 ? (e.push(t), t) : void 0
                    });
                    return e
                }, r = function (t, e) {
                    return null != e ? n(t).filter(e) : n(t)
                }, u = function (t) {
                    var e;
                    for (e = this[0][t]; e && 1 !== e.nodeType;) e = e[t];
                    return n(e)
                }
            }(t),
            t.Gestures = function (t) {
                var e, r, i, u, o, a, c, l, s, f, h, d, p, v;
                return d = !1,
                    l = {},
                    o = null,
                    f = null,
                    i = ["input", "select", "textarea"],
                    p = function (t) {
                        return l[t.name] = t.handler, e(t.events)
                    },
                    v = function (n, e, r) {
                        return t(n).trigger(e, r, f)
                    },
                    h = function (t) {
                        var e;
                        return e = (t.srcElement || t.target).tagName.toLowerCase(), n.call(i, e) >= 0 ? t.stopPropagation() : (d = !
                            0, f = t || event, o = a(t), c("start", t.target, o))
                    },
                    s = function (t) {
                        return d ? (f = t || event, o = a(t), o.length > 1 && f.preventDefault(), c("move", t.target, o)) : void 0
                    },
                    u = function (t) {
                        d ?
                            (f = t || event, c("end", t.target, o), d = !1)
                            :
                            void 0
                    },
                    r = function (t) {
                        return d = !1, c("cancel")
                    },
                    e = function (n) {
                        return n.forEach(function (n) {
                            return t.fn[n] = function (e) {
                                return t(document.body).delegate(this.selector, n, e)
                            }
                        }), this
                    },
                    c = function (t, n, e) {
                        var r, i, u;
                        u = [];
                        for (i in l) r = l[i], r[t] && u.push(r[t].call(r, n, e));
                        return u
                    },
                    a = function (t) {
                        var n, e, r, i, u;
                        for (r = t.touches || [t], i = [], n = 0, e = r.length; e > n; n++) u = r[n], i.push({
                            x: u.pageX,
                            y: u.pageY
                        });
                        return i
                    },
                    t(document).ready(function () {
                        var n;
                        return n = t(document.body), n.bind("touchstart", h), n.bind("touchmove", s), n.bind("touchend", u), n.bind(
                            "touchcancel", r)
                    }),
                    {
                        add: p,
                        trigger: v
                    }
            }(t),
            t.Gestures.add({
                name: "basic",
                events: ["touch", "hold", "doubleTap"],
                handler: function (t) {
                    var n, e, r, i, u, o, a, c, l, s, f, h;
                    return e = 15, n = {
                        TAP: 200,
                        DOUBLE_TAP: 400,
                        HOLD: 400
                    }, i = null, c = !0, a = null, o = null, u = null, h = function (e, r) {
                        return 1 === r.length ? (o = {
                            time: new Date,
                            x: r[0].x,
                            y: r[0].y
                        },
                            a = e,
                            i = setTimeout(function () {
                                return t.trigger(e, "hold", r[0])
                            }, n.HOLD)) : l()
                    }, f = function (t, n) {
                        var i;
                        return null !== o && (i = r(o, n[0]), i.x > e || i.y > e || n.length > 1) ? l() : void 0
                    }, s = function (e, a) {
                        var c, s;
                        if (o) return c = r(o, a[0]), 0 !== c.x || 0 !== c.y ? l() : (clearTimeout(i), s = new Date, s - o.time <
                        n.TAP ? s - u < n.DOUBLE_TAP ? (t.trigger(e, "doubleTap", a[0]), u = null) : (u = s, t.trigger(
                            e, "touch", a[0])) : void 0)
                    }, l = function () {
                        return o = null, c = !1, clearTimeout(i)
                    }, r = function (t, n) {
                        var e;
                        return e = {
                            x: n.x - t.x,
                            y: n.y - t.y
                        }
                    }, {
                        start: h,
                        move: f,
                        end: s,
                        cancel: l
                    }
                }(t.Gestures)
            }),
            t.Gestures.add({
                name: "drag",
                events: ["drag", "dragging"],
                handler: function (t) {
                    var n, e, r, i, u, o, a, c, l, s, f, h;
                    return n = window.devicePixelRatio >= 2 ? 15 : 20, c = null, o = null, a = null, u = null, h = function (t,
                                                                                                                             n) {
                        return n.length >= 2 ? (c = t, o = n.length, a = e(n)) : void 0
                    }, f = function (t, n) {
                        var e;
                        return n.length === o ? (e = r(n), u = {
                            touches: n,
                            delta: e
                        }, i(!0)) : void 0
                    }, l = s = function (t, n) {
                        return a && u ? (i(!1), o = null, a = null, u = null) : void 0
                    }, r = function (t) {
                        var n;
                        return n = e(t), {
                            x: n.x - a.x,
                            y: n.y - a.y
                        }
                    }, e = function (t) {
                        var n, e, r, i, u;
                        for (i = 0, u = 0, n = 0, e = t.length; e > n; n++) r = t[n], i += parseInt(r.x), u += parseInt(r.y);
                        return {
                            x: i / t.length,
                            y: u / t.length
                        }
                    }, i = function (e) {
                        return e ? t.trigger(c, "dragging", u) : Math.abs(u.delta.x) > n || Math.abs(u.delta.y) > n ? t.trigger(
                            c, "drag", u) : void 0
                    }, {
                        start: h,
                        move: f,
                        end: s
                    }
                }(t.Gestures)
            }),
            t.Gestures.add({
                name: "pinch",
                events: ["pinch", "pinching", "pinchIn", "pinchOut"],
                handler: function (t) {
                    var n, e, r, i, u, o, a, c, l, s;
                    return n = window.devicePixelRatio >= 2 ? 15 : 20, o = null, u = null, i = null, s = function (t, n) {
                        return 2 === n.length ? (o = t, u = r(n[0], n[1])) : void 0
                    }, l = function (t, n) {
                        var o;
                        return u && 2 === n.length ? (o = r(n[0], n[1]), i = {
                            touches: n,
                            delta: o - u
                        }, e(!0)) : void 0
                    }, a = c = function (t, n) {
                        return u && i ? (e(!1), u = null, i = null) : void 0
                    }, r = function (t, n) {
                        return Math.sqrt((n.x - t.x) * (n.x - t.x) + (n.y - t.y) * (n.y - t.y))
                    }, e = function (e) {
                        var r;
                        return e ? t.trigger(o, "pinching", i) : Math.abs(i.delta) > n ? (t.trigger(o, "pinch", i), r = i.delta >
                        0 ? "pinchOut" : "pinchIn", t.trigger(o, r, i)) : void 0
                    }, {
                        start: s,
                        move: l,
                        end: c
                    }
                }(t.Gestures)
            }),
            t.Gestures.add({
                name: "rotation",
                events: ["rotate", "rotating", "rotateLeft", "rotateRight"],
                handler: function (t) {
                    var n, e, r, i, u, o, a, c, l, s, f, h, d;
                    return n = 5, e = 20, l = null, u = 0, c = null, i = null, d = function (t, n) {
                        return 2 === n.length ? (l = t, u = 0, c = o(n[0], n[1])) : void 0
                    }, h = function (t, n) {
                        var l;
                        return c && 2 === n.length ? (l = o(n[0], n[1]) - c, i && Math.abs(i.delta - l) > e && (l += 360 * a(i.delta)),
                        Math.abs(l) > 360 && (u++, l -= 360 * a(i.delta)), i = {
                            touches: n,
                            delta: l,
                            rotationsCount: u
                        }, r(!0)) : void 0
                    }, s = f = function (t, n) {
                        return c && i ? (r(!1), l = null, u = 0, c = null, i = null, c = null) : void 0
                    }, a = function (t) {
                        return 0 > t ? -1 : 1
                    }, o = function (t, n) {
                        var e;
                        return e = Math.atan2(t.y - n.y, t.x - n.x), 180 * (0 > e ? e + 2 * Math.PI : e) / Math.PI
                    }, r = function (e) {
                        var r;
                        return e ? t.trigger(l, "rotating", i) : Math.abs(i.delta) > n ? (t.trigger(l, "rotate", i), r = i.delta >
                        0 ? "rotateRight" : "rotateLeft", t.trigger(l, r, i)) : void 0
                    }, {
                        start: d,
                        move: h,
                        end: f
                    }
                }(t.Gestures)
            }),
            t.Gestures.add({
                name: "swipe",
                events: ["swipe", "swipeLeft", "swipeRight", "swipeUp", "swipeDown", "swiping", "swipingHorizontal",
                    "swipingVertical"],
                handler: function (t) {
                    var n, e, r, i, u, o, a, c, l, s, f;
                    return n = Math.round(20 / window.devicePixelRatio), a = null, u = null, o = null, i = null, f = function (
                        t, n) {
                        return 1 === n.length ? (a = t, u = n[0], i = null) : void 0
                    }, s = function (t, n) {
                        var r, o;
                        return 1 === n.length ? (r = {
                            x: n[0].x - u.x,
                            y: n[0].y - u.y
                        }, o = null === i, i = {
                            x: n[0].x,
                            y: n[0].y,
                            delta: r
                        }, e(!0, o)) : i = null
                    }, c = l = function (t, n) {
                        var r;
                        return null == i && n.length >= 1 && (r = {
                            x: n[0].x - u.x,
                            y: n[0].y - u.y
                        }, i = {
                            x: n[0].x,
                            y: n[0].y,
                            delta: r
                        }), i ? (e(!1), i = null) : void 0
                    }, e = function (e, u) {
                        var c, l, s, f, h;
                        if (null == u && (u = !1), e) return u && (o = r(i.delta.x, i.delta.y)), null !== o && t.trigger(a,
                            "swiping" + o, i), t.trigger(a, "swiping", i);
                        if (l = [], Math.abs(i.delta.y) > n ? l.push(i.delta.y < 0 ? "Up" : "Down") : Math.abs(i.delta.x) > n &&
                                l.push(i.delta.x < 0 ? "Left" : "Right"), l.length) {
                            for (t.trigger(a, "swipe", i), h = [], s = 0, f = l.length; f > s; s++) c = l[s], h.push(t.trigger(
                                a, "swipe" + c, i));
                            return h
                        }
                    }, r = function (t, n) {
                        var e;
                        return e = null, Math.round(Math.abs(t / n)) >= 2 ? e = "Horizontal" : Math.round(Math.abs(n / t)) >= 2 &&
                            (e = "Vertical"), e
                    }, {
                        start: f,
                        move: s,
                        end: l
                    }
                }(t.Gestures)
            })
    }).call(_this);
    return _this.$$;
})()));
export default MPreviewObj;
