
function createTask(incoming, outcoming) {

	var taskId = 'Task_' + Math.random().toString().replace('0.','');
	var attr = [];

	attr.push({
    	key:   "id",
    	value: taskId
	});	
	var taskTag = tagFactory('Task', attr);
	if(incoming.length > 1){
		var incomingTag = tagFactory('incoming', []);
		var contentTag = textTag(incoming);
		incomingTag.appendChild(contentTag);
		taskTag.appendChild(incomingTag)
	}
	if(outcoming.length > 1){
		var outcomingTag = tagFactory('outcoming', []);
		var contentTag = textTag(outcoming);
		outcomingTag.appendChild(contentTag);
		taskTag.appendChild(outcomingTag)
	}

	console.log(taskTag);
}

function tagFactory(type, attr) {

	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');
	
	var tag = xmlDoc.createElement("bpmn2:" + type);
	var prop;
	for (var i = 0; i < attr.length; i++) {
		prop = attr.pop();
		tag.setAttribute(prop.key, prop.value);	
	}
	
	return tag;
}

function textTag(text) {
	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');

	var textTag = xmlDoc.createTextNode(text);

	return textTag;
}