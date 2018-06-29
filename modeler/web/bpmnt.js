
function createTask(incoming, outgoing) {

	var taskId = 'Task_' + Math.random().toString().replace('0.','');
	var attr = [];

	attr.push({
    	key:   "id",
    	value: taskId
	});	
	var taskTag = tagFactory('bpmn2:Task', attr);
	if(incoming.length > 1){
		var incomingTag = tagFactory('bpmn2:incoming', []);
		var contentTag = textTag(incoming);
		incomingTag.appendChild(contentTag);
		taskTag.appendChild(incomingTag);
	}
	if(outgoing.length > 1){
		var outgoingTag = tagFactory('bpmn2:outgoing', []);
		var contentTag = textTag(outgoing);
		outgoingTag.appendChild(contentTag);
		taskTag.appendChild(outgoingTag);
	}

	return taskTag;
}

function tagFactory(type, attr) {

	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');
	
	var tag = xmlDoc.createElement(type);
	var prop;
	var size = attr.length;
	for (var i = 0; i < size; i++) {
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

function createSequenceFlowId() {
	var sequenceFlowElementId = 'SequenceFlow_' + Math.random().toString().replace('0.','');
	return sequenceFlowElementId;
}

function createSequenceFlowTag(id, sourceRef, targetRef) {
	var attr = [];
	
	attr.push({
    	key:   "sourceRef",
    	value: sourceRef
	},{
    	key:   "targetRef",
    	value: targetRef
	},{
    	key:   "id",
    	value: id
	});		

	var tag = tagFactory('bpmn2:sequenceFlow', attr);
	//tag.setAttribute('sourceRef', sourceRef);

	console.log(tag);

	return tag;
}

function getDeeperElement(xml) {
	console.log(xml);
	var bounds = xml.getElementsByTagName('dc:Bounds');
	var maxY = -99999999999999;
	var height,y;
	for (var i=0; i < bounds.length; i++){
		y = bounds[0].getAttribute('y');
		height = bounds[0].getAttribute('height');
		y = parseInt(y) + 4 * parseInt(height);
		if(y > maxY) {
			maxY = y;
		}
	}

	return maxY;
}


function getXPosElement(elementId, xml) {
	var tagId = elementId + "_di";
	var xPosition;

	var x = xml.getElementById(tagId).getElementsByTagName('dc:Bounds')[0].getAttribute('x');

	xPosition = x;

	return xPosition;
}


 function getSelectedElementPosX(id, xml) {

 	var tagId = id + "_di";

	var xPosition;

	var x = xml.getElementById(tagId).getElementsByTagName('dc:Bounds')[0].getAttribute('x');

	var height =  xml.getElementById(tagId).getElementsByTagName('dc:Bounds')[0].getAttribute('height');

	xPosition = parseInt(x) + parseInt(height);

	return xPosition;


 }


 function getSelectedElementPosY(id, xml){ 


 	var tagId = id + "_di";

	var yPosition;

	var y = xml.getElementById(tagId).getElementsByTagName('dc:Bounds')[0].getAttribute('y');

	var width =  xml.getElementById(tagId).getElementsByTagName('dc:Bounds')[0].getAttribute('width');

	yPosition = parseInt(y) + (parseInt(width)/2);

	return yPosition;

 }



 function createTaskGraphic(id, posX, posY, height, width) {

 	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');

	var attr = [];

	attr.push({
    	key:   "id",
    	value: id + "_di"
	},{
    	key:   "bpmnElement",
    	value: id
	});

	var tag = tagFactory('bpmndi:BPMNShape', attr);

	attr = [];

	attr.push({
    	key:   "x",
    	value: posX
	},{
    	key:   "y",
    	value: posY
	},{
    	key:   "width",
    	value: width
	},{
    	key:   "height",
    	value: height
	});


	var bounds = tagFactory('dc:Bounds', attr);

	tag.appendChild(bounds);

	return tag;

 }


 function createSQGraphic(id, posX_1, posY_1, posX_2, posY_2) {

 	var parse = new DOMParser();
	var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');

	var attr = [];

	attr.push({
    	key:   "id",
    	value: id + "_di"
	},{
    	key:   "bpmnElement",
    	value: id
	});

	var tag = tagFactory('bpmndi:BPMNEdge', attr);

	attr = [];

	attr.push({
    	key:   "x",
    	value: posX_1
	},{
    	key:   "y",
    	value: posY_1
	});

	var wp1 = tagFactory('di:waypoint', attr);

	attr = [];

	attr.push({
    	key:   "x",
    	value: posX_2
	},{
    	key:   "y",
    	value: posY_2
	});

	var wp2 = tagFactory('di:waypoint', attr);

	tag.appendChild(wp1);
	tag.appendChild(wp2);

	return tag;
 }

 function xml2String (xml) {

	var string = new XMLSerializer().serializeToString(xml);

 	return string;
 }

 function operationInsertSerial (selectedElement, bpmnXml) {

   var elementXml = bpmnXml.getElementById(selectedElement);        
   var outgoingSequenceFlow = elementXml.getElementsByTagName('bpmn2:outgoing')[0].innerHTML;                
   var newOutgoingSequenceFlow = createSequenceFlowId();           
   elementXml.getElementsByTagName('bpmn2:outgoing')[0].innerHTML = newOutgoingSequenceFlow;           
   var newTask = createTask(newOutgoingSequenceFlow, outgoingSequenceFlow);
   var newSequenceFlow = createSequenceFlowTag(newOutgoingSequenceFlow, selectedElement, newTask.id);
   bpmnXml.getElementById(outgoingSequenceFlow).setAttribute('sourceRef', newTask.id);
   bpmnXml.getElementsByTagName('bpmn2:process')[0].appendChild(newSequenceFlow);
   bpmnXml.getElementsByTagName('bpmn2:process')[0].appendChild(newTask);

   var posNewTaskY = getDeeperElement(bpmnXml);
   var posNewTaskX = getXPosElement(selectedElement, bpmnXml);

   var posSelectectElementX = getSelectedElementPosX(selectedElement, bpmnXml);
   var posSelectectElementY = getSelectedElementPosY(selectedElement, bpmnXml);

   var newTaskDi = createTaskGraphic(newTask.id, posNewTaskX, posNewTaskY, '80', '100');

   var newSequenceFlowDi = createSQGraphic(newOutgoingSequenceFlow, parseInt(posSelectectElementX)-40, parseInt(posSelectectElementY)+30, parseInt(posNewTaskX)+40, parseInt(posNewTaskY));

   bpmnXml.getElementsByTagName('bpmndi:BPMNPlane')[0].appendChild(newTaskDi);
   bpmnXml.getElementsByTagName('bpmndi:BPMNPlane')[0].appendChild(newSequenceFlowDi);
   var temp = bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1];
   bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1] = bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[0];
   bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[0].setAttribute('x', parseInt(posNewTaskX)+100);
   bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[0].setAttribute('y',  parseInt(posNewTaskY)+5);

   var bpmnString = xml2String(bpmnXml);   

   return bpmnString;

 }


  function operationDelete(selectedElement, bpmnXml) {

   var elementXml = bpmnXml.getElementById(selectedElement);        
   var outgoingSequenceFlow = elementXml.getElementsByTagName('bpmn2:outgoing')[0].innerHTML;
   var incomingSequenceFlow = elementXml.getElementsByTagName('bpmn2:incoming')[0].innerHTML;

   var outgoingSequenceFlowDestinationElement = bpmnXml.getElementById(outgoingSequenceFlow).getAttribute('targetRef');

   bpmnXml.getElementById(incomingSequenceFlow).setAttribute('targetRef', outgoingSequenceFlowDestinationElement);
   bpmnXml.getElementById(outgoingSequenceFlowDestinationElement).getElementsByTagName('bpmn2:incoming')[0].innerHTML = incomingSequenceFlow;

   bpmnXml.getElementById(incomingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].setAttribute('x', bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].getAttribute('x'));
   bpmnXml.getElementById(incomingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].setAttribute('y', bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].getAttribute('y')); 

   bpmnXml.getElementsByTagName('bpmn2:process')[0].removeChild(bpmnXml.getElementById(selectedElement));

   bpmnXml.getElementsByTagName('bpmn2:process')[0].removeChild(bpmnXml.getElementById(outgoingSequenceFlow));

   bpmnXml.getElementsByTagName('bpmndi:BPMNPlane')[0].removeChild(bpmnXml.getElementById(selectedElement + "_di"));

   bpmnXml.getElementsByTagName('bpmndi:BPMNPlane')[0].removeChild(bpmnXml.getElementById(outgoingSequenceFlow + "_di"));

   var bpmnString = xml2String(bpmnXml);

   return bpmnString;
   
 }