//这是一个匿名函数
//在创建的同时即执行
//前面加个";"为了避免在混淆压缩后其它前面的方法漏加了结束语句导致运行报莫名错误
;
(function() {
	'use strict';

	var $form_add_task = $('.add-task')
		, task_list = []
		, $task_delete_trigger
		, $task_detail_trigger
		, $task_detail = $('.task-detail')
		, $task_detail_mask = $('.task-detail-mask')
		, current_index
		, $update_form
		, $task_detail_content
		, $task_detail_content_input
		, $checkbox_complete
		, $msg = $('.msg')
		, $msg_content = $msg.find('.msg-content')
		, $alerter = $('.alerter')
		;

	init();

	// 表单submit时监听
	$form_add_task.on('submit', on_add_task_form_submit);
	$task_detail_mask.on('click', hide_task_detail);

	function on_add_task_form_submit(event) {
		// 禁用默认行为
		event.preventDefault();

		var new_task = {};
		// 获取新task值
		var $input = $(this).find('input[name=content]');
		new_task.content = $input.val();
		// 如果新task值为空直接返回
		if (!new_task.content) return;
		// 存入新task
		if (add_task(new_task)) {
			// render_task_list();
			//提交完清空输入框
			$input.val(null);
		}
	}

	// 查找并监听所有删除按钮的点击事件
	function listen_task_delete() {
		// 删除监听
		$task_delete_trigger.on('click', function(event) {
			event.preventDefault();
			var $this = $(this);
			// 找到删除按钮所在的task元素
			var $item = $this.parent().parent();
			var index = $item.data('index');
			// 确认删除

			$.confirm({
    			title: '',
			    content: '确定删除这项任务？',
			    type: '',
			    buttons: {   
			        ok: {
			            text: "是",
			            btnClass: 'btn-primary',
			            keys: ['enter'],
			            action: function(){
			            	delete_task(index);
			            }
			        },
			        cancel: {
			        	text: "否",
			        	btnClass:'btn-primary',
			        	action: function(){
			            	// console.log('the user clicked cancel');
			            }
			        }
			    }
			});
		});
	}

	// 监听打开task详情事件
	function listen_task_detail() {
		var index;
		$task_detail_trigger.on('click', function(event) {
			event.preventDefault();
			var $this = $(this);
			var $item = $this.parent().parent();
			index = $item.data('index');
			show_task_detail(index);
		});

		$('.task-item').on('dblclick', function(event) {
			event.preventDefault();
			index = $(this).data('index');
			show_task_detail(index);
		});
	}

	// 监听task完成事件
	function listen_checkbox_complete() {
		$checkbox_complete.on('click', function(event) {
			var $this = $(this);

			var index = $this.parent().parent().data('index');
			var item = getTaskItem(index);
			if (item.complete) {
				update_task(index, {complete: false});
			} else {
				update_task(index, {complete: true});
			}
		});
	}

	function getTaskItem(index) {
		var list = store.get('task_list');
		if (list) {
			return store.get('task_list')[index];
		}
		return null;
	}

	// 显示task详情
	function show_task_detail(index) {
		// 生成详情模板
		render_task_detail(index);
		current_index = index;
		// 显示详情模板，默认隐藏
		$task_detail.show();
		$task_detail_mask.show();
	}

	// 隐藏task详情
	function hide_task_detail() {
		$task_detail.hide();
		$task_detail_mask.hide();
	}

	// 更新task
	function update_task(index, data) {
		if (index === undefined || !task_list[index]) return;
		// task_list[index] = data;
		task_list[index] = $.extend({}, task_list[index], data);
		refresh_task_list();
	}

	// 渲染具体task明细
	function render_task_detail(index) {
		if (index === undefined || !task_list[index]) return;
		var item = task_list[index];
		var tpl =
			'<form>' +
			'<div class="content">' +
			item.content +
			'</div>' +
			'<div class="input-item">' +
			'<input style="display:none" type="text" name="content" value="' + (item.content || '') + '">' +
			'</div>' +
			'<div>' +
			'<div class="desc input-item">' +
			'<textarea name="desc" placeholder="任务明细">' + (item.desc || '') + '</textarea>' +
			'</div>' +
			'</div>' +
			'<div class="remind input-item inputContainer">' +
			'<label>提醒时间:</label>'+
			'<div><input class="datetime" type="text" name="remind_date" value="' + (item.remind_date || '') + '"></div>' +
			'</div>' +
			'<div class="input-item"><button type="submit" id="updatetaskbtn">Submit</button></div>' +
			'</form>';

		// 用新模板替换旧模板	
		$task_detail.html(null);
		$task_detail.html(tpl);

		$('.datetime').datetimepicker();

		// 选中其中的form元素，使用其监听submit事件
		$update_form = $task_detail.find('form');
		// 选中显示task内容的元素
		$task_detail_content = $update_form.find('[class=content]');
		// 选中task input的元素
		$task_detail_content_input = $update_form.find('[name=content]');
		// 当内容元素双击，显示input隐藏自己
		$task_detail_content.on('dblclick', function(event) {
			event.preventDefault();
			$task_detail_content_input.show();
			$task_detail_content.hide();
		});

		$update_form.on('submit', function(event) {
			event.preventDefault();
			var data = {};
			// 获取表单中各个input的值
			data.content = $(this).find('[name=content]').val();
			data.desc = $(this).find('[name=desc]').val();
			data.remind_date = $(this).find('[name=remind_date]').val();
			update_task(index, data);
			hide_task_detail();
		});
	}

	// 刷新localstorage数据并渲染模板,刷新定时提醒
	function refresh_task_list() {
		store.set('task_list', task_list);
		render_task_list();
		task_remind_check();
	}

	function add_task(new_task) {

		task_list.push(new_task);
		// 更新localstorage
		refresh_task_list();
		return true;
	}

	// 删除一条task
	function delete_task(index) {
		// 如果没有index或者index不存在，返回
		if (index === undefined || !task_list[index]) return;
		delete task_list[index];
		// 更新localstorage
		refresh_task_list();
	}

	function init() {
		task_list = store.get('task_list') || [];
		if (task_list.length) {
			render_task_list();
			task_remind_check();
		}
	}

	// 检查提醒task
	function task_remind_check() {
		var current_timestamp;
		var itl = setInterval(function() {
			for (var i = 0; i < task_list.length; i++) {
				var item = getTaskItem(i),
					task_timestamp;
				if (!item || !item.remind_date || item.informed) continue;
				current_timestamp = (new Date()).getTime();
				task_timestamp = (new Date(item.remind_date)).getTime();
				// console.log('current_timestamp,task_timestamp',current_timestamp,task_timestamp);
				if (current_timestamp - task_timestamp >= 1) {
					update_task(i, {informed: true});
					show_msg(item.content);
				}
			}
		}, 300);
	}

	// 显示task提醒
	function show_msg(msg) {
		if (!msg) return;
		$msg_content.html(msg);
		$alerter.get(0).play();
		$.alert({
			type: '',
			title: '新的任务',
			content: msg,
			icon: 'glyphicon glyphicon-info-sign',
			buttons: {
				ok: {
					text: "是",
					btnClass: 'btn-primary',
					keys: ['enter'],
					action: function() {
						console.log('the user clicked ok');
					}
				}
			}
		});
	}

	// 渲染所有task模板
	function render_task_list() {
		var $task_list = $('.task-list');
		$task_list.html('');
		var complete_items = [];
		for (var i = 0; i < task_list.length; i++) {
			var item = task_list[i];
			if (item && item.complete) {
				complete_items[i] = item;
			} else {
				var $task = render_task_item(item, i);
				// 每次新增的添加到显示列表第一个
				$task_list.prepend($task);
			}
		}

		for (var j = 0; j < complete_items.length; j++) {
			$task = render_task_item(complete_items[j], j);
			if (!$task) continue;
			$task.addClass('completed');
			$task_list.append($task);
		}

		$task_delete_trigger = $('.action.delete');
		$task_detail_trigger = $('.action.detail');
		$checkbox_complete = $('.task-list .complete[type="checkbox"]');
		listen_task_delete();
		listen_task_detail();
		listen_checkbox_complete();
	}

	// 渲染单条task模板
	function render_task_item(data, index) {
		if (!data) return;
		var list_item_tpl =
			'<div class="task-item" data-index="' + index + '">' +
			'<span><input class="complete"' + (data.complete ? 'checked' : '') + ' type="checkbox"></span>' +
			'<span class="task-content">' + data.content + '</span>' +
			'<span class="task-item-span">' +
			'<span class="action delete"> 删除</span>' +
			'<span class="action detail"> 明细</span>' +
			'</span>' +
			'</div>';
		return $(list_item_tpl);
	}

})();