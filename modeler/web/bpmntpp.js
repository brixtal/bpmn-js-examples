function getElementPathByDataElementId(id){
    gTags = document.getElementsByTagName("g");

    for (let index = 0; index < gTags.length; index++) {
        if(gTags[index].getAttribute('data-element-id') == id){
            innerTags = gTags[index].childNodes;
            for(let j = 0; j < innerTags.length; j++){
                if(innerTags[j].nodeName == "g"){
                    
                    innerInnerTags = innerTags[j].childNodes;

                    for (let k = 0; k < innerInnerTags.length; k++) {
                        if(innerInnerTags[k].nodeName == 'path') {
                            return innerInnerTags[k];
                        }
                    }
                    break;
                }
            }
            break;
        }
    }
}