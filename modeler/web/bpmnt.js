var parse = new DOMParser();

var processId;

function createTask(incoming, outgoing, name, bpmntTaskId='') {
	if(bpmntTaskId == '') {
		var taskId2 = 'Task_' + Math.random().toString().replace('0.','');
	}
	else {
		var taskId2 = bpmntTaskId;
	}
	
	var attr = [];

	attr.push({
    	key:   "id",
    	value: taskId2
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

 function operationInsertSerial (selectedElement, bpmnXml, readingBPMNtFile = false, bpmntName='', bpmntTaskId='') {

   var elementXml = bpmnXml.getElementById(selectedElement);   
   var outgoingSequenceFlow = elementXml.getElementsByTagName('bpmn:outgoing')[0].innerHTML;                
   var newOutgoingSequenceFlow = createSequenceFlowId();           
   elementXml.getElementsByTagName('bpmn:outgoing')[0].innerHTML = newOutgoingSequenceFlow;   
   if(!readingBPMNtFile) {
	var name = prompt("Please enter the new task name:", "New Task"); 	
	var newTask = createTask(newOutgoingSequenceFlow, outgoingSequenceFlow, name);
   }
   else {
	var name = bpmntName;
	var newTask = createTask(newOutgoingSequenceFlow, outgoingSequenceFlow, name, bpmntTaskId);
   }
   if(name == null) name = '';   
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
   bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[1] = bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[0];
   bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[0].setAttribute('x', parseInt(posNewTaskX)+100);
   bpmnXml.getElementById(outgoingSequenceFlow + "_di").getElementsByTagName('di:waypoint')[0].setAttribute('y',  parseInt(posNewTaskY)+5);

   var bpmnString = xml2String(bpmnXml);

   if(!readingBPMNtFile){
 	  addOperationSerialInsertBPMNt(selectedElement, name, newTask.id);
	}

   return bpmnString;

 }

  function operationDelete(selectedElement, bpmnXml, readingBPMNtFile = false) {
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
	
	if(!readingBPMNtFile) {
		addOperationDeleteBPMNt(selectedElement, 'deleted_'+selectedElement);
	}
	var bpmnString = xml2String(bpmnXml);
	return bpmnString;
   
 }

 function operationMerge(selectedHtmlElement, bpmnXml, nameBPMNt = '', readingBPMNtFile = false) {
	var selectedElement = [];
	var newName = "";
	if(!readingBPMNtFile) {
		
		var name = '';
		var elementId;		

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
		addOperationMerge(selectedElement, newName);
	}
	else {
		selectedElement = selectedHtmlElement;
		newName = nameBPMNt;
	}
	bpmnXml = setNameElement(selectedElement[0], newName, bpmnXml);
	var bpmnString = xml2String(bpmnXml);
	var parser = new DOMParser();
	var xml;
	
	for (i=1; i < selectedElement.length; i++) {
		xml = parser.parseFromString(bpmnString, 'text/xml');
		
		bpmnString = operationDelete(selectedElement[i], xml, true);
	}	
	return bpmnString;
 }

 function operationRename(id, name, bpmnXml, readingBPMNtFile = false) {

	bpmnXml = setNameElement(id, name, bpmnXml);	
	
	if(!readingBPMNtFile) {
		addOperationRenameBPMNt(id, name);
	}
	bpmnString = xml2String(bpmnXml);
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
	element.setAttribute('download', 'diagram_' + getDateTime() + '.bpmn');
  
	element.style.display = 'none';
	document.body.appendChild(element);
  
	element.click();
  
	document.body.removeChild(element);
  }


  function downloadBPMNt() {	  
	if(sessionStorage.bpmnt){
		var element = document.createElement('a');
		element.setAttribute('href', 'data:application/bpmn20-xml;charset=UTF-8,' + sessionStorage.bpmnt);
		element.setAttribute('download', 'tailored_diagram_' + getDateTime() + '.bpmnt');
	
		element.style.display = 'none';
		document.body.appendChild(element);
	
		element.click();
	
		document.body.removeChild(element);
	}
	else {
		alert("There isn't a tailoring operation to be saved into a bpmnt file.")
	}	
  }

  function compare(){
	  window.location = '../../../bpmnt-diffing/app/index.html';
  }

  function initTailoring() {
	if(!sessionStorage.tailoring || sessionStorage.tailoring == 'false'){
		console.log('entrei');
		var bpmntXmlPattern = 	  '<?xml version="1.0" encoding="UTF-8"?> \n'
						+ '<definitions id="def1" xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:BaseProcess="BaseProcess" xmlns:extension="http://www.extensions.com/bpmnt" targetNamespace="TailoredSpecificationAndDesign">\n'
						+ '\t<import importType="http://www.w3.org/2001/XMLSchema" location="BPMNt.xsd" namespace="http://www.extensions.com/bpmnt"/>\n'
						+ '\t<import importType="http://www.omg.org/spec/BPMN/20100524/MODEL" location="Specification_and_Design.bpmn" namespace="BaseProcess"/>\n'
						+ '\t<extension mustUnderstand="true" definition="extension:bpmnt"/>\n'
						+ '</definitions>';	

		var bpmntXmlParsed = parse.parseFromString(bpmntXmlPattern, 'text/xml');

		var tailoring = false;
		var xml = decodeURIComponent(sessionStorage.getItem("bpmn"));
		var docXml = parse.parseFromString(xml, 'text/xml');

		processId = docXml.getElementsByTagName('bpmn:process')[0].getAttribute('id');
		
		var processName = docXml.getElementsByTagName('bpmn:process')[0].getAttribute('name');
		if(processName == null) processName = '';

		var attr = [];

		attr.push({
			key: 'id',
			value: 'Tailored_'+ processId
		}, {
			key: 'name',
			value: processName
		});

		var tagProcess = tagFactory('process', attr);
		
		bpmntXmlParsed.getElementsByTagName('definitions')[0].appendChild(tagProcess);
		bpmntXmlParsed.getElementById('Tailored_' + processId).appendChild(getDefaultBPMNtExtensionTag());
		bpmntXmlParsed.getElementById('Tailored_' + processId).getElementsByTagName('extension:useKind')[0].innerHTML = 'Extension';		
		bpmntXmlParsed.getElementById('Tailored_' + processId).getElementsByTagName('extension:usedBaseElement')[0].innerHTML = 'BaseProcess:' + processId;
		sessionStorage.tailoring = true;
		sessionStorage.bpmnt = encodeURIComponent(xml2String(bpmntXmlParsed));
	}
  }

  function getDefaultBPMNtExtensionTag() {
	var tagBPMNtExtension = tagFactory('extensionElements', []);
	tagBPMNtExtension.appendChild(tagFactory('extension:bpmnt', []));
	tagBPMNtExtension.getElementsByTagName('extension:bpmnt')[0].appendChild(tagFactory('extension:useKind', []));
	tagBPMNtExtension.getElementsByTagName('extension:bpmnt')[0].appendChild(tagFactory('extension:usedBaseElement', []));
	return tagBPMNtExtension;
  }

  function addOperationSerialInsertBPMNt(operatationElement, name, idNewElement) {
	
	initTailoring();

	var bpmntXmlParsed = parse.parseFromString(decodeURIComponent(sessionStorage.bpmnt), 'text/xml');	
	var processId = bpmntXmlParsed.getElementsByTagName('process')[0].getAttribute('id');

	var attr = [];

	attr.push({
		key: 'id',
		value: 'SerialInsert_' + idNewElement
		}, {
		key: 'name',
		value: name
	});

	var tagTask = tagFactory('task', attr);
	
	var tagBPMNtExtension = getDefaultBPMNtExtensionTag();	

	tagBPMNtExtension.getElementsByTagName('extension:usedBaseElement')[0].innerHTML = 'BaseProcess:'+ operatationElement;

	tagBPMNtExtension.getElementsByTagName('extension:useKind')[0].innerHTML = 'SerialInsert';
	
	tagTask.appendChild(tagBPMNtExtension);

	console.log(processId);

	bpmntXmlParsed.getElementById(processId).appendChild(tagTask);

	sessionStorage.bpmnt = encodeURIComponent(xml2String(bpmntXmlParsed));

  } 

  function addOperationDeleteBPMNt(id, name) {
	
	initTailoring();

	var bpmntXmlParsed = parse.parseFromString(decodeURIComponent(sessionStorage.bpmnt), 'text/xml');
	var processId = bpmntXmlParsed.getElementsByTagName('process')[0].getAttribute('id');

	var attr = [];

	attr.push({
		key: 'id',
		value: 'Delete_' + id
		}, {
		key: 'name',
		value: name
	});

	var tagTask = tagFactory('task', attr);
	
	var tagBPMNtExtension = getDefaultBPMNtExtensionTag();

	tagBPMNtExtension.getElementsByTagName('extension:usedBaseElement')[0].innerHTML = 'BaseProcess:'+ id;

	tagBPMNtExtension.getElementsByTagName('extension:useKind')[0].innerHTML = 'Delete';
	
	tagTask.appendChild(tagBPMNtExtension);

	bpmntXmlParsed.getElementById(processId).appendChild(tagTask);

	sessionStorage.bpmnt = encodeURIComponent(xml2String(bpmntXmlParsed));

  } 

function loadOperations() {
    var operations = readBPMNtFile();
}

function readBPMNtFile() {

    var parser = new DOMParser();
    var bpmntFile = parser.parseFromString(decodeURIComponent(sessionStorage.bpmnt), 'text/xml');

    var extension = bpmntFile.getElementsByTagName('extension:bpmnt'); 

    for(var i=0; i < extension.length; i++) {
		
        var operation = extension[i].getElementsByTagName('extension:useKind')[0].innerHTML;
		var elementId = extension[i].getElementsByTagName('extension:usedBaseElement')[0].innerHTML.replace('BaseProcess:', '');
		var typeElement = extension[i].parentNode.parentNode.tagName;
		var name = extension[i].parentNode.parentNode.getAttribute('name');
		var taskId = extension[i].parentNode.parentNode.getAttribute('id');		
		var xml = parser.parseFromString(decodeURIComponent(sessionStorage.bpmn), 'text/xml');
		
		if(operation == "SerialInsert"){			
			taskId = taskId.replace('SerialInsert_', '');
			sessionStorage.bpmn = encodeURIComponent(operationInsertSerial(elementId, xml, true, name, taskId));			
		}
		else if(operation == "Delete"){
			sessionStorage.bpmn = encodeURIComponent(operationDelete(elementId, xml, true));
		}
		else if(operation == "Rename"){
			sessionStorage.bpmn = encodeURIComponent(operationRename(elementId, name, xml, true));
		}
		else if(operation == 'Merge'){
			var elements = elementId.split(';');
			var mergeElements = [];
			for(var j=0; j<elements.length; j++){
				mergeElements.push(elements[j]);
			}
			sessionStorage.bpmn = encodeURIComponent(operationMerge(mergeElements, xml, name, true));
		}
    }
}

function addOperationRenameBPMNt(id, name) {
	initTailoring();

	var bpmntXmlParsed = parse.parseFromString(decodeURIComponent(sessionStorage.bpmnt), 'text/xml');
	var processId = bpmntXmlParsed.getElementsByTagName('process')[0].getAttribute('id');

	var attr = [];

	attr.push({
		key: 'id',
		value: 'Rename_' + id
		}, {
		key: 'name',
		value: name
	});

	var tagTask = tagFactory('task', attr);
	
	var tagBPMNtExtension = getDefaultBPMNtExtensionTag();

	tagBPMNtExtension.getElementsByTagName('extension:usedBaseElement')[0].innerHTML = 'BaseProcess:'+ id;

	tagBPMNtExtension.getElementsByTagName('extension:useKind')[0].innerHTML = 'Rename';
	
	tagTask.appendChild(tagBPMNtExtension);

	bpmntXmlParsed.getElementById(processId).appendChild(tagTask);

	sessionStorage.bpmnt = encodeURIComponent(xml2String(bpmntXmlParsed));
}

function addOperationMerge(selectedElements, newName) {

	initTailoring();

	var bpmntXmlParsed = parse.parseFromString(decodeURIComponent(sessionStorage.bpmnt), 'text/xml');	
	var processId = bpmntXmlParsed.getElementsByTagName('process')[0].getAttribute('id');

	var attr = [];

	attr.push({
		key: 'id',
		value: 'Merge_' + selectedElements[0]
		}, {
		key: 'name',
		value: newName
	});

	var tagTask = tagFactory('task', attr);
	
	var tagBPMNtExtension = getDefaultBPMNtExtensionTag();	

	tagBPMNtExtension.getElementsByTagName('extension:usedBaseElement')[0].innerHTML = 'BaseProcess:' + selectedElements[0];

	for(var i = 1; i< selectedElements.length; i++){
		tagBPMNtExtension.getElementsByTagName('extension:usedBaseElement')[0].innerHTML = tagBPMNtExtension.getElementsByTagName('extension:usedBaseElement')[0].innerHTML + ";"+ selectedElements[i];
	}

	tagBPMNtExtension.getElementsByTagName('extension:useKind')[0].innerHTML = 'Merge';
	
	tagTask.appendChild(tagBPMNtExtension);

	bpmntXmlParsed.getElementById(processId).appendChild(tagTask);

	sessionStorage.bpmnt = encodeURIComponent(xml2String(bpmntXmlParsed));

}