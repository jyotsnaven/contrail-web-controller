define([
    'underscore'
], function (_) {
    var ConfigObjectListUtils = function () {
        var self = this;
        self.getObjListUrl = function(viewConfig) {
            var options = {type:viewConfig.hashParams.objName};
            var ajaxConfig = {
                    url: ctwc.URL_GET_CONFIG_LIST,
                    type:'POST',
                    data:self.getPostDataForGet(options)
                 };
           return ajaxConfig;
         }
         self.hideHeaderIcons = function(template) {
             template.find(".config-object-edit").hide();
             template.find(".object-basic-view").hide();
             template.find(".cancel-config-edit").hide();
             template.find(".config-jSon-form-edit").hide();
         }
         self.getCopiedContent = function(){
             $('#hiddenTextArea').removeClass('hide-header-icon');
             document.getElementById('hiddenTextArea').select();
             document.execCommand('copy');
             contrail.successMsg(ctwc.COPIED_MSG);
             $('#hiddenTextArea').addClass('hide-header-icon');
         }
         self.setContentInTextArea = function(model) {
             document.getElementById('hiddenTextArea').value = '';
             document.getElementById('hiddenTextArea').value = JSON.stringify(model,null,2); 
         }
         self.parseParentJsonKeyToLabel = function(key){
             var splitedKey = key.split('-'); var strStack = [];
             for(var i = 0; i < splitedKey.length; i++){
                 var captilizeStr = splitedKey[i].charAt(0).toUpperCase() + splitedKey[i].slice(1);
                 strStack.push(captilizeStr);
             }
             return strStack.join(' ');
         }
         self.setTextAreaHeight = function(configJson, template){
             var textAreaHeight = self.getWindowHeight() - 23;
             template.find("#jsonTextArea").css({"height": textAreaHeight});
             var text = ctwc.TEXT_AREA_PLACEHOLDER + Object.keys(configJson)[0].slice(0,-1);
             template.find("#jsonTextArea").attr("placeholder",text);
             template.find("#jsonTextArea").val('');
         }
         self.getWindowHeight = function(){
             var outerHeight = window.outerHeight;
             var pageHeader = $("#pageHeader").height();
             var breadCrum = $("#breadcrumbs").height();
             return outerHeight - pageHeader - breadCrum - 107;
         }
         self.hideIconForNewConfigObj = function(template){
             template.find('.refresh-container').hide();
             template.find('.create-config-object').hide();
             template.find(".save-config-object").show();
             template.find("#jsonTextArea").css({'width':'100%'});
             template.find(".cancel-config-edit").show();
             template.find(".object-text-area-view").show();
             template.find(".object-json-view").hide();
         }
         self.showIconsAfterCancel = function(template){
             template.find('.refresh-container').show();
             template.find(".cancel-config-edit").hide();
             template.find(".object-text-area-view").hide();
             template.find(".object-json-view").show();
             template.find(".save-config-object").hide();
             template.find('.create-config-object').show();
             document.getElementById('jsonTextArea').value = '';
         }
         self.showIconsAfterSave = function(template){
             template.find('.refresh-container').show();
             template.find(".cancel-config-edit").hide();;
             template.find(".object-text-area-view").hide();
             template.find(".object-json-view").show();
             template.find(".save-config-object").hide();
             template.find('.create-config-object').show();
         }
         self.getPostDataForGet = function (options) {
             var type = options.type;
             var fields = options.fields;
             var parent_id = options.parentId;
             var postData = {
                "data" : [ {
                    "type" : type
                } ]
             }
             if(fields != null && fields.length > 0) {
                 postData['data'][0]['fields'] = fields;
             }
             if(parent_id != null && parent_id.length > 0) {
                 postData['data'][0]['parent_id'] = parent_id;
             }
             return JSON.stringify(postData);
         }
         self.formatJSON2HTML = function(json, formatDepth, ignoreKeys, hrefClick){
             var self = this;
             if(typeof json == 'string'){
                 json = JSON.parse(json);
             }
            return '<pre class="pre-format-JSON2HTML">' + self.formatJsonObject(json, formatDepth, 0, ignoreKeys, hrefClick) + '</pre>';
         }
         self.formatJsonObject = function(jsonObj, formatDepth, currentDepth, ignoreKeys, hrefClick) {
             var self = this, output = '',
                 objType = {type: 'object', startTag: '{', endTag: '}'};
             if(jsonObj instanceof Array){
                objType = {type: 'array', startTag: '[', endTag: ']'};
             }
             if(formatDepth == 0){
                 output += '<i class="node-' + currentDepth + ' fa fa-plus expander"></i> ' + objType.startTag + '<ul data-depth="' + currentDepth + '" class="node-' + currentDepth + ' node hide raw">' + 
                             JSON.stringify(jsonObj) + '</ul><span class="node-' + currentDepth + ' collapsed expander"> ... </span>' + objType.endTag + '<span class="hideSeperatedComma">,</span>';
             }
             else {
                 output += '<i class="node-' + currentDepth + ' fa fa-minus collapser"></i> ' + objType.startTag + '<ul data-depth="' + currentDepth + '" class="node-' + currentDepth + ' node">';
                 $.each(jsonObj, function(key, val){
                     if (!contrail.checkIfExist(ignoreKeys) || (contrail.checkIfExist(ignoreKeys) && ignoreKeys.indexOf(key) === -1)) {
                         if (objType['type'] == 'object') {
                             output += '<li class="key-value"><span class="key">' + key + '</span>: ';
                         }
                         else {
                             output += '<li class="key-value">';
                         }

                         if (val != null && typeof val == 'object') {
                             output += '<span class="value">' + self.formatJsonObject(val, formatDepth - 1, currentDepth + 1, ignoreKeys, hrefClick) + '</span>';
                         }
                         else {
                             if(hrefClick && (key === 'href' || key === 'parent_href')){
                                 output += '<span class="hyperlink value ' + typeof val + '"onclick=getClickedHref("' + val +'")>'+'"' + val +'"'+ '</span><span class="hideSeperatedComma">,</span>';
                             }else{
                                 if(typeof val === 'number'){
                                     output += '<span class="value config-number">' + val + '</span><span class="hideSeperatedComma">,</span>';
                                 }else if(typeof val === 'boolean'){
                                     output += '<span class="value config-boolean">' + val + '</span><span class="hideSeperatedComma">,</span>';
                                 }else if(typeof val === 'string'){
                                     output += '<span class="value ' + typeof val + '">'+'"' + val +'"'+ '</span><span class="hideSeperatedComma">,</span>';
                                 }else{
                                     output += '<span class="value ' + typeof val + '">' + val + '</span><span class="hideSeperatedComma">,</span>';
                                 }
                             }
                         }
                         output += '</li>';
                     }
                 });
                 output += '</ul><span class="node-' + currentDepth + ' collapsed hide expander"> ... </span>' + objType.endTag + '<span class="hideSeperatedComma">,</span>';
             }
             return output;
         }
         getClickedHref = function(href){
             var currentHashObj = layoutHandler.getURLHashObj();
             var splitHref = href.split('/');
             if(splitHref.length <=4){
                 loadFeature({p: currentHashObj['p'], q: {'objName': splitHref[splitHref.length - 1]}});
             }else{
                 loadFeature({p: currentHashObj['p'], q: {'objName': splitHref[splitHref.length - 2],'uuid':splitHref[splitHref.length - 1]}}); 
             }
         }
    };
   return new ConfigObjectListUtils;
});
