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
(function(win, $) {
    "use strict";
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
            placeholder: 'images/placeholder.gif',
            init: null,
            close: null
        },
        innerHTML =
            '<div class="ui-MPreview-wrap">'+
            '   <div class="ui-MPreview-row">'+
            '       <div class="ui-MPreview-toolbar">'+
            '            <div class="ui-MPreview-back"><a href="javascript:;">〈</a></div>'+
            '            <div class="ui-MPreview-title">{{title}}</div>'+
            '            <div class="ui-MPreview-pages"><span class="ui-MPreview-currentPage">00</span>/<span class="ui-MPreview-countPage">00</span></div>'+
            '        </div>'+
            '        <div class="ui-MPreview-view">'+
            '            <div class="ui-MPreview-imgbox">'+
            '                <ul class="ui-MPreview-imglist"></ul>'+
            '            </div>'+
            '            <div class="ui-MPreview-loading"></div>'+
            '        </div>'+
            '   </div>'+
            '</div>';

    /**
     * @name      将默认配置和选项合并
     * @param     options     {Object}     默认用户的参数
     * @return    {Object}
     */
    var cover = function( options, defaults ) {
        var i, options = options || {};
        for ( i in defaults ){
            if ( options[i] === undefined ) options[i] = defaults[i];
        }
        return options;
    };

    /**
     * 判断设备支持 transitionend 的前缀
     */
    var whichTransitionEvent = function() {
        var t,
            el = document.createElement('div'),
            transitions = {
                'WebkitTransition':'webkitTransitionEnd',
                'OTransition':'oTransitionEnd',
                'MozTransition':'transitionend',
                'transition':'transitionend'
            };
        for(t in transitions){
            if( el.style[t] !== undefined ){
                return transitions[t];
            }
        }
    };

    /**
     * @name      格式化当前页的数字
     * @param     val     {Number}     默认用户的参数
     * @return    {String}
     */
    var formatPage = function(val) {
        return val.toString().length < 2 ? '0' + val : val;
    };

    // 构造函数
    var MPreview = function(options) {
        return new MPreview.fn.init(options);
    };

    MPreview.fn = MPreview.prototype = {
        constructor: MPreview,
        init: function(options) {
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
        subscribe: function(key, val) {
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
        unsubscribe: function(key) {
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
        publish: function(key) {
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
        getTransform: function(e, name) {
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
            } else if(name === "scale") {
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
        scale: function(size) {
            if (!size.width || !size.height) {
                return {width: '100%', height: '100%'};
            }

            var r, w = size.width, h = size.height,
                screenW = parseInt(this.offset.width),
                screenH = parseInt(this.offset.height);

            // 图片宽大于屏幕宽
            if(w > screenW) {
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
        distance: function(a, b) {
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
        getOrigin: function(e, val) {
            var touchX = val === undefined ? e.touch.x : this.distance(e.touch.touches[0], e.touch.touches[1]).x,    // 点击当前位置X
                touchY = val === undefined ? e.touch.y : this.distance(e.touch.touches[0], e.touch.touches[1]).y,    // 点击当前位置Y
                size = {
                    width: val === undefined ? this.size[this.index-1].width : (parseInt($(e.target).css('width')) * val),
                    height: val === undefined ? this.size[this.index-1].height : (parseInt($(e.target).css('height')) * val)
                },                  // 当前图片原大小
                currentSize = val === undefined ? (this.scale(size)) : ({width: parseInt($(e.target).css('width')), height: parseInt($(e.target).css('height')) }),    // 当前图片现大小
                screen = this.screen,
                scale = val || size.width / currentSize.width,  // 最大缩放比
                imgAreaX = (screen.width - currentSize.width) / 2,     // 图片与容器之间的留白区左边
                imgAreaY = (screen.height - currentSize.height) / 2,   // 图片与容器之间的留白区上边
                originX = touchX - imgAreaX,    //点阵位置X
                originY = touchY - imgAreaY,     //点阵位置Y
                fix, maxTx, minTx, maxTy, minTy;

            if (size.width <= parseInt(this.offset.width, 10) && size.height <= parseInt(this.offset.height, 10)) {
                return false;
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
        destroy: function() {
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
        _action: function() {

            // 设置配置项
            this.subscribe('init', function() {
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
                this.resizeType =  typeof window.orientation == 'number' ? 'orientationchange' : 'resize';  //支持旋转的事件名
                this.config.direction = this.config.direction == 'left' ? true : false;   //滚动方向，true 横屏幕滚动，false 竖屏滚动

                $(_this.config.wrap)[0].style.cssText = css;
                $(document).on('touchmove', function(e) {e.preventDefault(); });
            });

            // 创建DOM
            this.subscribe('init', function() {
                var elems, DOM = {},
                    html = innerHTML.replace('{{title}}', this.config.title),
                    elem = $(this.config.wrap),
                    screen = this.screen;

                elem.html(html);
                elems = elem.find('*');
                elems.each(function(i, v) {
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
            this.subscribe('init', function() {
                var _this = this;
                this.DOM.back.on('touch', function(e) {
                    e.preventDefault();
                    _this.destroy();
                });
            });

            // 加载图片，并对应设置Key
            this.subscribe('load', function(val, key, callback) {
                var _this = this,
                    load = function( size ) {
                        if (!_this.size[key]) _this.size[key] = size;
                        callback && callback.call(_this, size);
                        setTimeout(function() {
                            _this.DOM.loading.addClass('ui-MPreview-hide');
                        }, 100);
                    };
                $.each(val, function(i, v) {
                    _this.DOM.loading.removeClass('ui-MPreview-hide');
                    var img = new Image();
                    img.src = v;
                    if (img.complete) {
                        load({width: img.width, height: img.height});
                    } else {
                        img.onload = function() {
                            load({width: img.width, height: img.height});
                            img.onload = null;
                        };
                    }
                });
            });

            // Ajax 请求
            this.subscribe('ajax', function() {
                if (!this.config.data && !this.config.url) return;

                var _this = this,
                    callback = function(data) {
                        this.data = data.imgs;
                        this.publish('load', [data.imgs[0]], 0, function(size) {
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
                    success: function(data) {
                        if (data.code > 0 && data.imgs && data.imgs.length) {
                            callback.call(_this, data);
                        }
                    },
                    error: function() {
                        alert('获取数据失败');
                    }
                });
            });

            // 创建数据DOM
            this.subscribe('append', function(size) {
                var temp = '',
                    DOM = this.DOM,
                    tpl = '<li data-index="{{index}}" style="width: '+ this.offset.width + '; height: ' + this.offset.height + ';"><img src="{{src}}" style="width: {{width}}; height: {{height}};" /></li>',
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
            this.subscribe('append', function() {
                this.DOM.countPage.text(formatPage(this.data.length));
            });

            // 设置分页值
            this.subscribe('setPage', function() {
                this.DOM.currentPage.text(formatPage(this.index));
            });

            // 预加载
            this.subscribe('preloading', function(val, callback) {
                var li = document.createElement('li'),
                    _this = this,
                    DOM = this.DOM,
                    index = val == 'next' ? (this.index + 1) : (this.index - 1),
                    append = function(elem, src, key) {
                        _this.publish('load', [src], key, function(size) {
                            size = _this.scale(size);
                            elem.html('<img src="' + src + '" style="width: '+ size.width +'px; height: '+ size.height +'px" />');
                            callback && callback();
                        });
                    };

                // 检测是否预加载到达最小值或最大值
                index--;
                li.style.width = _this.offset.width;
                li.style.height = _this.offset.height;

                if (index < 0  || index > (this.data.length-1))  return;
                if (val == 'prev' && this.index == (this.data.length-1)) return;

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
            this.subscribe('touchStyle', function(duration, x, y, timing) {
                var DOM = this.DOM.imglist;
                duration = duration || 0;
                x = x || 0;
                y = y || 0;
                DOM.vendor('transition', '-webkit-transform '+ duration +'ms ' + timing + ' 0s');
                DOM.vendor('transform', 'translate3d(' + x +'px, '+ y +'px, 0px)');
            });

            // 屏幕滚动
            this.subscribe('touch', function() {
                var startTx, startTy, direction, has,
                    _this = this,
                    w = parseInt(_this.offset.width, 10),
                    h = parseInt(_this.offset.height, 10),
                    minTx = parseInt(parseInt(this.offset.width) / 3, 10),
                    minTy = parseInt(parseInt(this.offset.height) / 3, 10),
                    DOM = this.DOM,
                    callback = function() {
                        _this.isScroll = false;
                        _this.isExec = false;
                        if (has) {
                            _this.publish('preloading', direction ? 'next' : 'prev');
                            var diff = ((_this.index - 1) * (_this.config.direction ? w : h)) - (_this.config.direction ? w : h);
                            if (_this.index == 1) diff = 0;
                            if (_this.index == _this.data.length) diff = diff - (_this.config.direction ? w : h);
                            DOM.imglist.style(_this.config.direction ? 'left' : 'top',  diff < 0 ? '0px' : diff + 'px');
                        }
                    };

                DOM.imgbox.on('touchstart', function(e) {
                    e.preventDefault();
                    if (_this.isExec || _this.isScale || e.touches.length > 1) return;
                    startTx = e.touches[0].clientX;
                    startTy = e.touches[0].clientY;
                });

                DOM.imgbox.on('touchmove', function(e) {
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
                        fix = _this.index > 1 ? (_this.index-1) * parseInt(_this.config.direction ? _this.offset.width : _this.offset.height, 10) : 0;

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

                DOM.imgbox.on('touchend', function(e) {
                    e.preventDefault();
                    if (_this.isExec ||  _this.isScale || e.touches.length > 1) return;

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
                    var scroll= -(_this.index-1) * (_this.config.direction ? w : h);
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
            this.subscribe('untouch', function() {
                var DOM = this.DOM;
                DOM.imgbox.off('touchstart');
                DOM.imgbox.off('touchmove');
                DOM.imgbox.off('touchend');
                DOM.imgbox.off(transition);
            });

            // 图片放大事件
            this.subscribe('zoom', function() {
                var DOM = this.DOM,
                    _this = this;

                // 双击图片放大，缩小
                DOM.imglist.on('doubleTap', 'li', function(e) {
                    _this.publish(_this.isScale ? 'zoomOut' : 'zoomIn', e);
                });

                // 缩放 缩小结束
                DOM.imglist.on('pinchIn', 'img', function(e) {
                    e.preventDefault();

                    if (_this.isScroll) return;
                    var $elem = $(e.target);
                    $elem.off('touchstart');
                    $elem.off('touchmove');

                    // 缩放最小值
                    if (_this.zoomInertia.scale <= 1) {
                        _this.isScale = false;
                        $elem.vendor('transition', '-webkit-transform 300ms ease 0s');
                        $elem.vendor('transform-origin', _this.zoomInertia.x + ' '+ _this.zoomInertia.y +' 0px');
                        $elem.vendor('transform', 'scale3d(1, 1, 1)');
                    } else {
                        if (_this.zoomInertia.scope) {
                            $elem.on('touchstart', function(event) {
                                _this.publish('imgTouchStart', event, this);
                            });
                            $elem.on('touchmove', function(event) {
                                _this.publish('imgTouchMove', event, this, _this.zoomInertia.scope);
                            });
                        }
                    }

                    _this.publish('zoomRecord', e.target);
                });

                // 缩放中
                DOM.imglist.on('pinching', 'img', function(e) {
                    e.preventDefault();
                    if (_this.isScroll) return;
                    _this.publish('zoomInertia', e);
                });

                //缩放放大结束
                DOM.imglist.on('pinchOut', 'img', function(e) {
                    e.preventDefault();

                    if (_this.isScroll) return;
                    var $elem = $(e.target);
                    $elem.off('touchstart');
                    $elem.off('touchmove');

                    if (_this.zoomInertia.scope) {
                        $elem.on('touchstart', function(event) {
                            _this.publish('imgTouchStart', event, this);
                        });
                        $elem.on('touchmove', function(event) {
                            _this.publish('imgTouchMove', event, this, _this.zoomInertia.scope);
                        });
                    }

                    _this.publish('zoomRecord', e.target);
                });

                //判断是否完成缩放结束，即两手指离开屏幕
                DOM.imglist.on('touchend', 'img', function(e) {
                    if (!e.touches.length && !_this.isScale && _this.isZoom) {
                        _this.isZoom = false;
                        _this.isExec = false;
                        // 修正因直接绑定而导致重复触发 touchend 事件
                        setTimeout(function() {
                            _this.publish('touch');
                        }, 10);
                    }
                });

            });

            //记录上一次 zoom 缩放的值
            this.subscribe('zoomRecord', function(elem) {
                this.zoomRecord = this.getTransform(elem, 'scale').x;
            });

            // 双击图片放大
            this.subscribe('zoomIn', function(e) {
                var _this = this,
                    $elem = e.target.nodeName === 'IMG' ? $(e.target) : $(e.target).find('img').first(),
                    origin = this.getOrigin(e);

                if (!origin) return;

                _this.isZoom = true;      // 标识当前是双指滚动中的事件
                this.publish('untouch');  // 卸载图片滚动事件

                //放大时图片Touch事件的绑定
                this.isScale = true;    // 标识图片已放大，禁用上下翻页功能
                $elem.on('touchstart', function(event) {
                    _this.publish('imgTouchStart', event, this);
                });
                $elem.on('touchmove', function(event) {
                    _this.publish('imgTouchMove', event, this, origin.scope);
                });

                //设置样式
                $elem.vendor('transform-origin', origin.x + ' '+ origin.y +' 0px');
                $elem.vendor('transition', '-webkit-transform 300ms ease-out 0s');
                $elem.vendor('transform', 'scale3d(' + origin.scale +', '+ origin.scale +', 1)');

                //设置记录值
                this.publish('zoomRecord', $elem[0]);
            });

            // 双击图片缩小
            this.subscribe('zoomOut', function(e) {
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
            this.subscribe('zoomInertia', function(e) {
                e.preventDefault();
                var scale, nScale,
                    fix,
                    $elem = $(e.target),
                    delta = e.touch.delta,          // 双指滚动的差值
                    w = parseInt($elem.css('width'), 10),
                    defaultWidth = w * this.zoomRecord,   //当前图片的宽度
                    imgWidth = this.size[this.index-1].width,  // 图片原宽度
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
                $elem.vendor('transform-origin', this.zoomInertia.x + ' '+ this.zoomInertia.y +' 0px');
                $elem.vendor('transform', 'scale3d(' + nScale +', '+ nScale +', 1)');
            });

            // 图片放大移动开始
            this.subscribe('imgTouchStart', function(e, elem) {
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

                $elem.vendor('transform', 'scale3d(' + move.scale.x +', '+ move.scale.y +', 1) translate3d(' + translate.x +'px, '+ translate.y +'px, 0px)');
            });

            // Resize
            this.subscribe('resize', function() {
                var c, DOM = this.DOM,
                    _this = this;

                var resize = function() {
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
                    DOM.imglist.find('li').each(function(i, elem) {
                        var $img = $(elem).find('img'),
                            index = parseInt($(elem).attr('data-index'), 10),
                            size = _this.size[index] && _this.scale(_this.size[index]);

                        elem.style.cssText = 'width:' + _this.offset.width + '; height: ' + _this.offset.height +';';
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
                $(window).on(_this.resizeType, function() {
                    clearTimeout(c);
                    c = setTimeout(resize, 300);
                });

            });

            return this;
        }
    };

    MPreview.fn.init.prototype = MPreview.fn;

    // 扩展至全局
    win.MPreview = MPreview;
    //追加样式
    var styles = document.createElement("style");
    styles.innerHTML = '.ui-MPreview-wrap{background:#000;overflow:hidden;-webkit-tap-highlight-color:rgba(0,0,0,0);position:absolute;width:100%;height:100%;left:0;top:0;font-family:"Microsoft YaHei", Airal, sans-serif;visibility:visible;z-index:10000;-webkit-text-size-adjust:none;-moz-text-size-adjust:none;-ms-text-size-adjust:none;text-size-adjust:none}.ui-MPreview-row{background:#333;color:#ccc;height:100%;left:0;position:absolute;top:0;width:100%;z-index:2}.ui-MPreview-toolbar{-webkit-backface-visibility:hidden;backface-visibility:hidden;background:#333;height:40px;left:0;line-height:40px;position:absolute;text-shadow:1px 1px 0 rgba(0,0,0,0.4);top:0;-webkit-transition-duration:.3s;transition-duration:.3s;-webkit-transition-property:-webkit-transform,opacity;transition-property:transform,opacity;-webkit-transition-timing-function:ease-in;transition-timing-function:ease-in;width:100%;z-index:5}.ui-MPreview-back{height:40px;line-height:40px;left:0;position:absolute;top:0;width:40px}.ui-MPreview-back > a{display:block;width:100%;height:100%;text-align:center;color:#FFF;text-decoration:none;text-indent:-8px}.ui-MPreview-back a:active{background-color:#000}.ui-MPreview-title{font-size:14px;font-weight:700;height:40px;left:50px;overflow:hidden;position:absolute;right:50px;text-align:center;text-overflow:ellipsis;top:0;white-space:nowrap;z-index:2;color:#DDD}.ui-MPreview-pages{display:inline;font-size:13px;height:40px;position:absolute;right:0;text-align:center;top:0;color:#ddd;width:40px}.ui-MPreview-view{background:#000;-webkit-tap-highlight-color:rgba(0,0,0,0);z-index:1;-webkit-user-select:none}.ui-MPreview-view,.ui-MPreview-imgbox{height:100%;overflow:hidden;position:absolute;width:100%}.ui-MPreview-loading{background:url(../images/MPreview.mobile.loading.gif) no-repeat 0 0;background-size:24px;height:24px;left:50%;margin:-12px 0 0 -12px;opacity:.3;position:absolute;top:50%;width:24px;z-index:1}.ui-MPreview-imgbox{display:none;z-index:2}.ui-MPreview-imgbox .ui-MPreview-imglist{height:100%;overflow:hidden;position:absolute;z-index:1;margin:0;padding:0;list-style:none;-webkit-transition:translate3d(0px, 0, 0);-moz-transform:translate3d(0px, 0, 0);transform:translate3d(0px, 0, 0)}.ui-MPreview-imgbox .ui-MPreview-imglist li{display:inline-block;overflow:hidden;text-align:center;vertical-align:top;list-style:none}.ui-MPreview-imgbox .ui-MPreview-imglist li:before{content:"";display:inline-block;height:100%;vertical-align:middle}.ui-MPreview-imgbox .ui-MPreview-imglist li img{vertical-align:middle;background:transparent}.ui-MPreview-hide{display:none}.ui-MPreview-show{display:block}';
    document.head.appendChild(styles);
}(window, (function() {
    /* QuoJS v2.3.6 - 2013/5/13
     http://quojs.tapquo.com
     Copyright (c) 2013 Javi Jimenez Villar (@soyjavi) - Licensed MIT */
    (function(){var e;e=function(){var e,t,n;t=[];e=function(t,r){var i;if(!t){return n()}else if(e.toType(t)==="function"){return e(document).ready(t)}else{i=e.getDOMObject(t,r);return n(i,t)}};n=function(e,r){e=e||t;e.__proto__=n.prototype;e.selector=r||"";return e};e.extend=function(e){Array.prototype.slice.call(arguments,1).forEach(function(t){var n,r;r=[];for(n in t){r.push(e[n]=t[n])}return r});return e};n.prototype=e.fn={};return e}();window.Quo=e;"$$$$"in window||(window.$$$$=e)}).call(this);(function(){(function(e){var t,n,r,i,u,a,o,s,c,f,l;t={TYPE:"GET",MIME:"json"};r={script:"text/javascript, application/javascript",json:"application/json",xml:"application/xml, text/xml",html:"text/html",text:"text/plain"};n=0;e.ajaxSettings={type:t.TYPE,async:true,success:{},error:{},context:null,dataType:t.MIME,headers:{},xhr:function(){return new window.XMLHttpRequest},crossDomain:false,timeout:0};e.ajax=function(n){var r,o,f,h;f=e.mix(e.ajaxSettings,n);if(f.type===t.TYPE){f.url+=e.serializeParameters(f.data,"?")}else{f.data=e.serializeParameters(f.data)}if(i(f.url)){return e.jsonp(f)}h=f.xhr();h.onreadystatechange=function(){if(h.readyState===4){clearTimeout(r);return c(h,f)}};h.open(f.type,f.url,f.async);s(h,f);if(f.timeout>0){r=setTimeout(function(){return l(h,f)},f.timeout)}try{h.send(f.data)}catch(d){o=d;h=o;a("Resource not found",h,f)}if(f.async){return h}else{return u(h,f)}};e.jsonp=function(t){var r,i,u,a;if(t.async){i="jsonp"+ ++n;u=document.createElement("script");a={abort:function(){e(u).remove();if(i in window){return window[i]={}}}};r=void 0;window[i]=function(n){clearTimeout(r);e(u).remove();delete window[i];return f(n,a,t)};u.src=t.url.replace(RegExp("=\\?"),"="+i);e("head").append(u);if(t.timeout>0){r=setTimeout(function(){return l(a,t)},t.timeout)}return a}else{return console.error("QuoJS.ajax: Unable to make jsonp synchronous call.")}};e.get=function(t,n,r,i){return e.ajax({url:t,data:n,success:r,dataType:i})};e.post=function(e,t,n,r){return o("POST",e,t,n,r)};e.put=function(e,t,n,r){return o("PUT",e,t,n,r)};e["delete"]=function(e,t,n,r){return o("DELETE",e,t,n,r)};e.json=function(n,r,i){return e.ajax({url:n,data:r,success:i,dataType:t.MIME})};e.serializeParameters=function(e,t){var n,r;if(t==null){t=""}r=t;for(n in e){if(e.hasOwnProperty(n)){if(r!==t){r+="&"}r+=""+encodeURIComponent(n)+"="+encodeURIComponent(e[n])}}if(r===t){return""}else{return r}};c=function(e,t){if(e.status>=200&&e.status<300||e.status===0){if(t.async){f(u(e,t),e,t)}}else{a("QuoJS.ajax: Unsuccesful request",e,t)}};f=function(e,t,n){n.success.call(n.context,e,t)};a=function(e,t,n){n.error.call(n.context,e,t,n)};s=function(e,t){var n;if(t.contentType){t.headers["Content-Type"]=t.contentType}if(t.dataType){t.headers["Accept"]=r[t.dataType]}for(n in t.headers){e.setRequestHeader(n,t.headers[n])}};l=function(e,t){e.onreadystatechange={};e.abort();a("QuoJS.ajax: Timeout exceeded",e,t)};o=function(t,n,r,i,u){return e.ajax({type:t,url:n,data:r,success:i,dataType:u,contentType:"application/x-www-form-urlencoded"})};u=function(e,n){var r,i;i=e.responseText;if(i){if(n.dataType===t.MIME){try{i=JSON.parse(i)}catch(u){r=u;i=r;a("QuoJS.ajax: Parse Error",e,n)}}else{if(n.dataType==="xml"){i=e.responseXML}}}return i};return i=function(e){return RegExp("=\\?").test(e)}})(Quo)}).call(this);(function(){(function(e){var t,n,r,i,u,a,o,s;t=[];i=Object.prototype;r=/^\s*<(\w+|!)[^>]*>/;u=document.createElement("table");a=document.createElement("tr");n={tr:document.createElement("tbody"),tbody:u,thead:u,tfoot:u,td:a,th:a,"*":document.createElement("div")};e.toType=function(e){return i.toString.call(e).match(/\s([a-z|A-Z]+)/)[1].toLowerCase()};e.isOwnProperty=function(e,t){return i.hasOwnProperty.call(e,t)};e.getDOMObject=function(t,n){var i,u,a;i=null;u=[1,9,11];a=e.toType(t);if(a==="array"){i=o(t)}else if(a==="string"&&r.test(t)){i=e.fragment(t.trim(),RegExp.$1);t=null}else if(a==="string"){i=e.query(document,t);if(n){if(i.length===1){i=e.query(i[0],n)}else{i=e.map(function(){return e.query(i,n)})}}}else if(u.indexOf(t.nodeType)>=0||t===window){i=[t];t=null}return i};e.map=function(t,n){var r,i,u,a;a=[];r=void 0;i=void 0;if(e.toType(t)==="array"){r=0;while(r<t.length){u=n(t[r],r);if(u!=null){a.push(u)}r++}}else{for(i in t){u=n(t[i],i);if(u!=null){a.push(u)}}}return s(a)};e.each=function(t,n){var r,i;r=void 0;i=void 0;if(e.toType(t)==="array"){r=0;while(r<t.length){if(n.call(t[r],r,t[r])===false){return t}r++}}else{for(i in t){if(n.call(t[i],i,t[i])===false){return t}}}return t};e.mix=function(){var t,n,r,i,u;r={};t=0;i=arguments.length;while(t<i){n=arguments[t];for(u in n){if(e.isOwnProperty(n,u)&&n[u]!==undefined){r[u]=n[u]}}t++}return r};e.fragment=function(t,r){var i;if(r==null){r="*"}if(!(r in n)){r="*"}i=n[r];i.innerHTML=""+t;return e.each(Array.prototype.slice.call(i.childNodes),function(){return i.removeChild(this)})};e.fn.map=function(t){return e.map(this,function(e,n){return t.call(e,n,e)})};e.fn.instance=function(e){return this.map(function(){return this[e]})};e.fn.filter=function(t){return e([].filter.call(this,function(n){return n.parentNode&&e.query(n.parentNode,t).indexOf(n)>=0}))};e.fn.forEach=t.forEach;e.fn.indexOf=t.indexOf;o=function(e){return e.filter(function(e){return e!==void 0&&e!==null})};return s=function(e){if(e.length>0){return[].concat.apply([],e)}else{return e}}})(Quo)}).call(this);(function(){(function(e){e.fn.attr=function(t,n){if(this.length===0){null}if(e.toType(t)==="string"&&n===void 0){return this[0].getAttribute(t)}else{return this.each(function(){return this.setAttribute(t,n)})}};e.fn.removeAttr=function(e){return this.each(function(){return this.removeAttribute(e)})};e.fn.data=function(e,t){return this.attr("data-"+e,t)};e.fn.removeData=function(e){return this.removeAttr("data-"+e)};e.fn.val=function(t){if(e.toType(t)==="string"){return this.each(function(){return this.value=t})}else{if(this.length>0){return this[0].value}else{return null}}};e.fn.show=function(){return this.style("display","block")};e.fn.hide=function(){return this.style("display","none")};e.fn.height=function(){var e;e=this.offset();return e.height};e.fn.width=function(){var e;e=this.offset();return e.width};e.fn.offset=function(){var e;e=this[0].getBoundingClientRect();return{left:e.left+window.pageXOffset,top:e.top+window.pageYOffset,width:e.width,height:e.height}};return e.fn.remove=function(){return this.each(function(){if(this.parentNode!=null){return this.parentNode.removeChild(this)}})}})(Quo)}).call(this);(function(){(function(e){var t,n,r,i,u,a,o;r=null;t=/WebKit\/([\d.]+)/;n={Android:/(Android)\s+([\d.]+)/,ipad:/(iPad).*OS\s([\d_]+)/,iphone:/(iPhone\sOS)\s([\d_]+)/,Blackberry:/(BlackBerry|BB10|Playbook).*Version\/([\d.]+)/,FirefoxOS:/(Mozilla).*Mobile[^\/]*\/([\d\.]*)/,webOS:/(webOS|hpwOS)[\s\/]([\d.]+)/};e.isMobile=function(){r=r||u();return r.isMobile&&r.os.name!=="firefoxOS"};e.environment=function(){r=r||u();return r};e.isOnline=function(){return navigator.onLine};u=function(){var e,t;t=navigator.userAgent;e={};e.browser=i(t);e.os=a(t);e.isMobile=!!e.os;e.screen=o();return e};i=function(e){var n;n=e.match(t);if(n){return n[0]}else{return e}};a=function(e){var t,r,i;t=null;for(r in n){i=e.match(n[r]);if(i){t={name:r==="iphone"||r==="ipad"?"ios":r,version:i[2].replace("_",".")};break}}return t};return o=function(){return{width:window.innerWidth,height:window.innerHeight}}})(Quo)}).call(this);(function(){(function(e){var t,n,r,i,u,a,o,s,c,f,l,h;t=1;i={};r={preventDefault:"isDefaultPrevented",stopImmediatePropagation:"isImmediatePropagationStopped",stopPropagation:"isPropagationStopped"};n={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",touch:"click",doubletap:"dblclick",orientationchange:"resize"};u=/complete|loaded|interactive/;e.fn.on=function(t,n,r){if(n==="undefined"||e.toType(n)==="function"){return this.bind(t,n)}else{return this.delegate(n,t,r)}};e.fn.off=function(t,n,r){if(n==="undefined"||e.toType(n)==="function"){return this.unbind(t,n)}else{return this.undelegate(n,t,r)}};e.fn.ready=function(t){if(u.test(document.readyState)){return t(e)}else{return e.fn.addEvent(document,"DOMContentLoaded",function(){return t(e)})}};e.Event=function(e,t){var n,r;n=document.createEvent("Events");n.initEvent(e,true,true,null,null,null,null,null,null,null,null,null,null,null,null);if(t){for(r in t){n[r]=t[r]}}return n};e.fn.bind=function(e,t){return this.each(function(){l(this,e,t)})};e.fn.unbind=function(e,t){return this.each(function(){h(this,e,t)})};e.fn.delegate=function(t,n,r){return this.each(function(i,u){l(u,n,r,t,function(n){return function(r){var i,o;o=e(r.target).closest(t,u).get(0);if(o){i=e.extend(a(r),{currentTarget:o,liveFired:u});return n.apply(o,[i].concat([].slice.call(arguments,1)))}}})})};e.fn.undelegate=function(e,t,n){return this.each(function(){h(this,t,n,e)})};e.fn.trigger=function(t,n,r){if(e.toType(t)==="string"){t=e.Event(t,n)}if(r!=null){t.originalEvent=r}return this.each(function(){this.dispatchEvent(t)})};e.fn.addEvent=function(e,t,n){if(e.addEventListener){return e.addEventListener(t,n,false)}else if(e.attachEvent){return e.attachEvent("on"+t,n)}else{return e["on"+t]=n}};e.fn.removeEvent=function(e,t,n){if(e.removeEventListener){return e.removeEventListener(t,n,false)}else if(e.detachEvent){return e.detachEvent("on"+t,n)}else{return e["on"+t]=null}};l=function(t,n,r,u,a){var c,l,h,d;n=s(n);h=f(t);l=i[h]||(i[h]=[]);c=a&&a(r,n);d={event:n,callback:r,selector:u,proxy:o(c,r,t),delegate:c,index:l.length};l.push(d);return e.fn.addEvent(t,d.event,d.proxy)};h=function(t,n,r,u){var a;n=s(n);a=f(t);return c(a,n,r,u).forEach(function(n){delete i[a][n.index];return e.fn.removeEvent(t,n.event,n.proxy)})};f=function(e){return e._id||(e._id=t++)};s=function(t){var r;r=e.isMobile()?t:n[t];return r||t};o=function(e,t,n){var r;t=e||t;r=function(e){var r;r=t.apply(n,[e].concat(e.data));if(r===false){e.preventDefault()}return r};return r};c=function(e,t,n,r){return(i[e]||[]).filter(function(e){return e&&(!t||e.event===t)&&(!n||e.callback===n)&&(!r||e.selector===r)})};return a=function(t){var n;n=e.extend({originalEvent:t},t);e.each(r,function(e,r){n[e]=function(){this[r]=function(){return true};return t[e].apply(t,arguments)};return n[r]=function(){return false}});return n}})(Quo)}).call(this);(function(){(function($$$$){var CURRENT_TOUCH,EVENT,FIRST_TOUCH,GESTURE,GESTURES,HOLD_DELAY,TAPS,TOUCH_TIMEOUT,_angle,_capturePinch,_captureRotation,_cleanGesture,_distance,_fingersPosition,_getTouches,_hold,_isSwipe,_listenTouches,_onTouchEnd,_onTouchMove,_onTouchStart,_parentIfText,_swipeDirection,_trigger;TAPS=null;EVENT=void 0;GESTURE={};FIRST_TOUCH=[];CURRENT_TOUCH=[];TOUCH_TIMEOUT=void 0;HOLD_DELAY=650;GESTURES=["touch","tap","singleTap","doubleTap","hold","swipe","swiping","swipeLeft","swipeRight","swipeUp","swipeDown","rotate","rotating","rotateLeft","rotateRight","pinch","pinching","pinchIn","pinchOut","drag","dragLeft","dragRight","dragUp","dragDown"];GESTURES.forEach(function(e){$$$$.fn[e]=function(t){var n;n=e==="touch"?"touchend":e;return $$$$(document.body).delegate(this.selector,n,t)};return this});$$$$(document).ready(function(){return _listenTouches()});_listenTouches=function(){var e;e=$$$$(document.body);e.bind("touchstart",_onTouchStart);e.bind("touchmove",_onTouchMove);e.bind("touchend",_onTouchEnd);return e.bind("touchcancel",_cleanGesture)};_onTouchStart=function(e){var t,n,r,i;EVENT=e;r=Date.now();t=r-(GESTURE.last||r);TOUCH_TIMEOUT&&clearTimeout(TOUCH_TIMEOUT);i=_getTouches(e);n=i.length;FIRST_TOUCH=_fingersPosition(i,n);GESTURE.el=$$$$(_parentIfText(i[0].target));GESTURE.fingers=n;GESTURE.last=r;if(!GESTURE.taps){GESTURE.taps=0}GESTURE.taps++;if(n===1){if(n>=1){GESTURE.gap=t>0&&t<=250}return setTimeout(_hold,HOLD_DELAY)}else if(n===2){GESTURE.initial_angle=parseInt(_angle(FIRST_TOUCH),10);GESTURE.initial_distance=parseInt(_distance(FIRST_TOUCH),10);GESTURE.angle_difference=0;return GESTURE.distance_difference=0}};_onTouchMove=function(e){var t,n,r;EVENT=e;if(GESTURE.el){r=_getTouches(e);t=r.length;if(t===GESTURE.fingers){CURRENT_TOUCH=_fingersPosition(r,t);n=_isSwipe(e);if(n){GESTURE.prevSwipe=true}if(n||GESTURE.prevSwipe===true){_trigger("swiping")}if(t===2){_captureRotation();_capturePinch();e.preventDefault()}}else{_cleanGesture()}}return true};_isSwipe=function(e){var t,n,r;t=false;if(CURRENT_TOUCH[0]){n=Math.abs(FIRST_TOUCH[0].x-CURRENT_TOUCH[0].x)>30;r=Math.abs(FIRST_TOUCH[0].y-CURRENT_TOUCH[0].y)>30;t=GESTURE.el&&(n||r)}return t};_onTouchEnd=function(e){var t,n,r,i,u;EVENT=e;_trigger("touch");if(GESTURE.fingers===1){if(GESTURE.taps===2&&GESTURE.gap){_trigger("doubleTap");_cleanGesture()}else if(_isSwipe()||GESTURE.prevSwipe){_trigger("swipe");u=_swipeDirection(FIRST_TOUCH[0].x,CURRENT_TOUCH[0].x,FIRST_TOUCH[0].y,CURRENT_TOUCH[0].y);_trigger("swipe"+u);_cleanGesture()}else{_trigger("tap");if(GESTURE.taps===1){TOUCH_TIMEOUT=setTimeout(function(){_trigger("singleTap");return _cleanGesture()},100)}}}else{t=false;if(GESTURE.angle_difference!==0){_trigger("rotate",{angle:GESTURE.angle_difference});i=GESTURE.angle_difference>0?"rotateRight":"rotateLeft";_trigger(i,{angle:GESTURE.angle_difference});t=true}if(GESTURE.distance_difference!==0){_trigger("pinch",{angle:GESTURE.distance_difference});r=GESTURE.distance_difference>0?"pinchOut":"pinchIn";_trigger(r,{distance:GESTURE.distance_difference});t=true}if(!t&&CURRENT_TOUCH[0]){if(Math.abs(FIRST_TOUCH[0].x-CURRENT_TOUCH[0].x)>10||Math.abs(FIRST_TOUCH[0].y-CURRENT_TOUCH[0].y)>10){_trigger("drag");n=_swipeDirection(FIRST_TOUCH[0].x,CURRENT_TOUCH[0].x,FIRST_TOUCH[0].y,CURRENT_TOUCH[0].y);_trigger("drag"+n)}}_cleanGesture()}return EVENT=void 0};_fingersPosition=function(e,t){var n,r;r=[];n=0;e=e[0].targetTouches?e[0].targetTouches:e;while(n<t){r.push({x:e[n].pageX,y:e[n].pageY});n++}return r};_captureRotation=function(){var angle,diff,i,symbol;angle=parseInt(_angle(CURRENT_TOUCH),10);diff=parseInt(GESTURE.initial_angle-angle,10);if(Math.abs(diff)>20||GESTURE.angle_difference!==0){i=0;symbol=GESTURE.angle_difference<0?"-":"+";while(Math.abs(diff-GESTURE.angle_difference)>90&&i++<10){eval("diff "+symbol+"= 180;")}GESTURE.angle_difference=parseInt(diff,10);return _trigger("rotating",{angle:GESTURE.angle_difference})}};_capturePinch=function(){var e,t;t=parseInt(_distance(CURRENT_TOUCH),10);e=GESTURE.initial_distance-t;if(Math.abs(e)>10){GESTURE.distance_difference=e;return _trigger("pinching",{distance:e})}};_trigger=function(e,t){if(GESTURE.el){t=t||{};if(CURRENT_TOUCH[0]){t.iniTouch=GESTURE.fingers>1?FIRST_TOUCH:FIRST_TOUCH[0];t.currentTouch=GESTURE.fingers>1?CURRENT_TOUCH:CURRENT_TOUCH[0]}return GESTURE.el.trigger(e,t,EVENT)}};_cleanGesture=function(e){FIRST_TOUCH=[];CURRENT_TOUCH=[];GESTURE={};return clearTimeout(TOUCH_TIMEOUT)};_angle=function(e){var t,n,r;t=e[0];n=e[1];r=Math.atan((n.y-t.y)*-1/(n.x-t.x))*(180/Math.PI);if(r<0){return r+180}else{return r}};_distance=function(e){var t,n;t=e[0];n=e[1];return Math.sqrt((n.x-t.x)*(n.x-t.x)+(n.y-t.y)*(n.y-t.y))*-1};_getTouches=function(e){if($$$$.isMobile()){return e.touches}else{return[e]}};_parentIfText=function(e){if("tagName"in e){return e}else{return e.parentNode}};_swipeDirection=function(e,t,n,r){var i,u;i=Math.abs(e-t);u=Math.abs(n-r);if(i>=u){if(e-t>0){return"Left"}else{return"Right"}}else{if(n-r>0){return"Up"}else{return"Down"}}};return _hold=function(){if(GESTURE.last&&Date.now()-GESTURE.last>=HOLD_DELAY){_trigger("hold");return GESTURE.taps=0}}})(Quo)}).call(this);(function(){(function(e){e.fn.text=function(t){if(t||e.toType(t)==="number"){return this.each(function(){return this.textContent=t})}else{return this[0].textContent}};e.fn.html=function(t){var n;n=e.toType(t);if(t||n==="number"||n==="string"){return this.each(function(){var e,r,i,u;if(n==="string"||n==="number"){return this.innerHTML=t}else{this.innerHTML=null;if(n==="array"){u=[];for(r=0,i=t.length;r<i;r++){e=t[r];u.push(this.appendChild(e))}return u}else{return this.appendChild(t)}}})}else{return this[0].innerHTML}};e.fn.append=function(t){var n;n=e.toType(t);return this.each(function(){var e=this;if(n==="string"){return this.insertAdjacentHTML("beforeend",t)}else if(n==="array"){return t.each(function(t,n){return e.appendChild(n)})}else{return this.appendChild(t)}})};e.fn.prepend=function(t){var n;n=e.toType(t);return this.each(function(){var e=this;if(n==="string"){return this.insertAdjacentHTML("afterbegin",t)}else if(n==="array"){return t.each(function(t,n){return e.insertBefore(n,e.firstChild)})}else{return this.insertBefore(t,this.firstChild)}})};e.fn.replaceWith=function(t){var n;n=e.toType(t);this.each(function(){var e=this;if(this.parentNode){if(n==="string"){return this.insertAdjacentHTML("beforeBegin",t)}else if(n==="array"){return t.each(function(t,n){return e.parentNode.insertBefore(n,e)})}else{return this.parentNode.insertBefore(t,this)}}});return this.remove()};return e.fn.empty=function(){return this.each(function(){return this.innerHTML=null})}})(Quo)}).call(this);(function(){(function(e){var t,n,r,i,u,a;r="parentNode";t=/^\.([\w-]+)$/;n=/^#[\w\d-]+$/;i=/^[\w-]+$/;e.query=function(e,r){var u;r=r.trim();if(t.test(r)){u=e.getElementsByClassName(r.replace(".",""))}else if(i.test(r)){u=e.getElementsByTagName(r)}else if(n.test(r)&&e===document){u=e.getElementById(r.replace("#",""));if(!u){u=[]}}else{u=e.querySelectorAll(r)}if(u.nodeType){return[u]}else{return Array.prototype.slice.call(u)}};e.fn.find=function(t){var n;if(this.length===1){n=Quo.query(this[0],t)}else{n=this.map(function(){return Quo.query(this,t)})}return e(n)};e.fn.parent=function(e){var t;t=e?a(this):this.instance(r);return u(t,e)};e.fn.siblings=function(e){var t;t=this.map(function(e,t){return Array.prototype.slice.call(t.parentNode.children).filter(function(e){return e!==t})});return u(t,e)};e.fn.children=function(e){var t;t=this.map(function(){return Array.prototype.slice.call(this.children)});return u(t,e)};e.fn.get=function(e){if(e===undefined){return this}else{return this[e]}};e.fn.first=function(){return e(this[0])};e.fn.last=function(){return e(this[this.length-1])};e.fn.closest=function(t,n){var r,i;i=this[0];r=e(t);if(!r.length){i=null}while(i&&r.indexOf(i)<0){i=i!==n&&i!==document&&i.parentNode}return e(i)};e.fn.each=function(e){this.forEach(function(t,n){return e.call(t,n,t)});return this};a=function(t){var n;n=[];while(t.length>0){t=e.map(t,function(e){if((e=e.parentNode)&&e!==document&&n.indexOf(e)<0){n.push(e);return e}})}return n};return u=function(t,n){if(n===undefined){return e(t)}else{return e(t).filter(n)}}})(Quo)}).call(this);(function(){(function(e){var t,n,r;t=["-webkit-","-moz-","-ms-","-o-",""];e.fn.addClass=function(e){return this.each(function(){if(!r(e,this.className)){this.className+=" "+e;return this.className=this.className.trim()}})};e.fn.removeClass=function(e){return this.each(function(){if(!e){return this.className=""}else{if(r(e,this.className)){return this.className=this.className.replace(e," ").replace(/\s+/g," ").trim()}}})};e.fn.toggleClass=function(e){return this.each(function(){if(r(e,this.className)){return this.className=this.className.replace(e," ")}else{this.className+=" "+e;return this.className=this.className.trim()}})};e.fn.hasClass=function(e){return r(e,this[0].className)};e.fn.style=function(e,t){if(t){return this.each(function(){return this.style[e]=t})}else{return this[0].style[e]||n(this[0],e)}};e.fn.css=function(e,t){return this.style(e,t)};e.fn.vendor=function(e,n){var r,i,u,a;a=[];for(i=0,u=t.length;i<u;i++){r=t[i];a.push(this.style(""+r+e,n))}return a};r=function(e,t){var n;n=t.split(/\s+/g);return n.indexOf(e)>=0};return n=function(e,t){return document.defaultView.getComputedStyle(e,"")[t]}})(Quo)}).call(this);
    return $$$$;
})()));
if(!this.MPreview){
    exports.imagesBrowsing = MPreview;
}