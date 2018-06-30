
function createTask(incoming, outgoing, name) {

	var taskId = 'Task_' + Math.random().toString().replace('0.','');
	var attr = [];

	attr.push({
    	key:   "id",
    	value: taskId
	}, {
		key: "name",
		value: name
	});	
	var taskTag = tagFactory('bpmn:Task', attr);
	if(incoming.length > 1){
		var incomingTag = tagFactory('bpmn:incoming', []);
		var contentTag = textTag(incoming);
		incomingTag.appendChild(contentTag);
		taskTag.appendChild(incomingTag);
	}
	if(outgoing.length > 1){
		var outgoingTag = tagFactory('bpmn:outgoing', []);
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

	var tag = tagFactory('bpmn:sequenceFlow', attr);
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
   var outgoingSequenceFlow = elementXml.getElementsByTagName('bpmn:outgoing')[0].innerHTML;                
   var newOutgoingSequenceFlow = createSequenceFlowId();           
   elementXml.getElementsByTagName('bpmn:outgoing')[0].innerHTML = newOutgoingSequenceFlow;
   var name = prompt("Please enter the new task name:", "New Task"); 
   if(name == null) name = '';   
   var newTask = createTask(newOutgoingSequenceFlow, outgoingSequenceFlow, name);
   var newSequenceFlow = createSequenceFlowTag(newOutgoingSequenceFlow, selectedElement, newTask.id);
   bpmnXml.getElementById(outgoingSequenceFlow).setAttribute('sourceRef', newTask.id);
   bpmnXml.getElementsByTagName('bpmn:process')[0].appendChild(newSequenceFlow);
   bpmnXml.getElementsByTagName('bpmn:process')[0].appendChild(newTask);

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
	try {
	   var elementXml = bpmnXml.getElementById(selectedElement);        
	   var outgoingSequenceFlow = elementXml.getElementsByTagName('bpmn:outgoing')[0].innerHTML;
	   var incomingSequenceFlow = elementXml.getElementsByTagName('bpmn:incoming')[0].innerHTML;

	   var outgoingSequenceFlowDestinationElement = bpmnXml.getElementById(outgoingSequenceFlow).getAttribute('targetRef');

	   bpmnXml.getElementById(incomingSequenceFlow).setAttribute('targetRef', outgoingSequenceFlowDestinationElement);
	   bpmnXml.getElementById(outgoingSequenceFlowDestinationElement).getElementsByTagName('bpmn:incoming')[0].innerHTML = incomingSequenceFlow;

	   bpmnXml.getElementById(incomingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].setAttribute('x', bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].getAttribute('x'));
	   bpmnXml.getElementById(incomingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].setAttribute('y', bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1].getAttribute('y')); 

	   bpmnXml.getElementsByTagName('bpmn:process')[0].removeChild(bpmnXml.getElementById(selectedElement));

	   bpmnXml.getElementsByTagName('bpmn:process')[0].removeChild(bpmnXml.getElementById(outgoingSequenceFlow));

	   bpmnXml.getElementsByTagName('bpmndi:BPMNPlane')[0].removeChild(bpmnXml.getElementById(selectedElement + "_di"));

	   bpmnXml.getElementsByTagName('bpmndi:BPMNPlane')[0].removeChild(bpmnXml.getElementById(outgoingSequenceFlow + "_di"));	  
	}
	catch (err) {
		alert("ERROR:" + err.message);
	}
	var bpmnString = xml2String(bpmnXml);
	return bpmnString;
   
 }

 function operationMerge(selectedHtmlElement, bpmnXml) {

	var selectedElement = [];
	var name = '';
	var elementId;

	var newName = "";

	for (var i = 0; i < selectedHtmlElement.length; i++) {
		if(selectedHtmlElement[i].getAttribute('data-element-id') != null) {
			elementId = selectedHtmlElement[i].getAttribute('data-element-id');			
			selectedElement.push(elementId);

			name = bpmnXml.getElementById(elementId).getAttribute('name');

			if (i == 0){
				newName = name;
			}
			else {
				newName = newName + " & " + name;
			}			
		}
	}
	
	bpmnXml = setNameElement(selectedElement[0], newName, bpmnXml);
	
	var bpmnString = xml2String(bpmnXml);
	var parser = new DOMParser();
	var xml;
	for (i=1; i < selectedElement.length; i++) {
		xml = parser.parseFromString(bpmnString, 'text/xml');
		bpmnString = operationDelete(selectedElement[i], xml);
	}
	return bpmnString;
 }

 function isValidElement(elementId, operation) {
	var invalidElements = [];	
 	if(operation =='delete') {
 		invalidElements = ['StartEvent', 'EndEvent'];
 	}
 	for (var i=0; i < invalidElements.length; i++){
 		console.log(elementId.indexOf(invalidElements[i]));
 		if(elementId.indexOf(invalidElements[i]) >= 0) return false;
 	}
 	
 	return true;

 }

 function setNameElement(id, name, bpmnXml) {

 	bpmnXml.getElementById(id).setAttribute('name', name);

 	return bpmnXml;

 }

 function getDateTime() {
	var date = new Date();

	date = date.getFullYear() + '-' + addZero(date.getMonth()+1) + '-' + addZero(date.getDate()) + '-' + addZero(date.getHours()) + '-' + addZero(date.getMinutes()) + '-' + addZero(date.getSeconds()) + '-' + add3Zero(date.getMilliseconds());

	return date;

	function addZero(i) {
		if (i < 10) {
			i = "0" + i;
		}
		return i;
	}

	function add3Zero(i){
		if(i < 10) {
			return "00" + i;
		}
		if(i < 100){
			return "0" + i;
		}
		return i;		
	}
 }

 function download() {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:application/bpmn20-xml;charset=UTF-8,' + sessionStorage.bpmn);
	element.setAttribute('download', getDateTime() + '.bpmn');
  
	element.style.display = 'none';
	document.body.appendChild(element);
  
	element.click();
  
	document.body.removeChild(element);
  }