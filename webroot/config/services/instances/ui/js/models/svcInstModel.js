/*
 * Copyright (c) 2015 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-model',
    'knockout',
    'config/services/instances/ui/js/models/InterfacesModel',
    'config/services/instances/ui/js/svcInst.utils',
    'config/services/instances/ui/js/models/PortTupleModel',
    'config/services/instances/ui/js/models/SvcHealthChkModel',
    'config/services/instances/ui/js/models/IntfRtTableModel',
    'config/services/instances/ui/js/models/RtPolicyModel',
    'config/services/instances/ui/js/models/RtAggregateModel',
], function (_, ContrailModel, Knockout, InterfacesModel, SvcInstUtils,
             PortTupleModel, SvcHealthChkModel, IntfRtTableModel, RtPolicyModel,
             RtAggregateModel) {
    var gridElId = "#" + ctwl.SERVICE_INSTANCES_GRID_ID;
    var svcInstUtils = new SvcInstUtils();
    var SvcInstModel = ContrailModel.extend({
        defaultConfig: {
            service_template: null,
            display_name: null,
            status: 'Inactive',
            service_instance_properties: {
                interface_list: [],
                left_virtual_network: "",
                management_virtual_network: "",
                right_virtual_network: "",
                ha_mode: "",
                scale_out: {
                    max_instances: 1
                },
            },
            service_template_refs: [],
            fq_name: [],
            uuid: null,
            no_of_instances: 1,
            availability_zone: 'ANY',
            host_list: [],
            host: null,
            parent_uuid: null
        },
        validations: {
            svcInstValidations: {
                'no_of_instances': function(val, attr, data) {
                    var svcTmpl = data.service_template;
                    var svcTmpls = $(gridElId).data('svcInstTmplts');
                    var svcTmplFqn = getCookie('domain') + ":" +
                        svcTmpl.split(' - [')[0];
                    var svcTmplObj = svcTmpls[svcTmplFqn];

                    var svcScaling =
                        getValueByJsonPath(svcTmplObj,'service_template_properties;service_scaling',
                                           false);
                    var tmplVer =
                        getValueByJsonPath(svcTmplObj,'service_template_properties;version',
                                           1);
                    if ((2 == tmplVer) || (false == svcScaling)) {
                        return;
                    }
                    if ((null == val) || (isNaN(val))) {
                        return 'Instance count should be integer';
                    }
                },
                'display_name': function(val, attr, data) {
                    if ((null == data) || (null == data['display_name'])) {
                        return "Service Instance Name is required";
                    }
                    var dispName = data['display_name'].trim();
                    if (!dispName.length) {
                        return "Service Instance Name is required";
                    }
                    if (-1 != dispName.indexOf('_')) {
                        return 'Underscore is not allowed in Service ' +
                            'Instance Name';
                    }
                },
                'service_health_check': function(val, attr, data) {
                    var svcTmpl = data.service_template;
                    var svcTmplObj =
                        svcInstUtils.getSvcTmplDetailsBySvcTmplStr(svcTmpl);
                    var tmplVer =
                        getValueByJsonPath(svcTmplObj,'service_template_properties;version',
                                           1);
                    if (1 == tmplVer) {
                        return;
                    }
                    var svcHealthChecks = data['svcHealtchChecks'];
                    if (null == svcHealthChecks) {
                        return;
                    }
                    svcHealthChecks = svcHealthChecks.toJSON();
                    var len = svcHealthChecks.length;
                    var intfTypes = [];
                    var svcHealthChks = [];
                    for (var i = 0; i < len; i++) {
                        var intfType = svcHealthChecks[i]['interface_type']();
                        var svcHealthChkEntry =
                            svcHealthChecks[i]['service_health_check']();
                        if (null == intfType) {
                            return 'Interface type is required for service '+
                                'health check';
                        }
                        if (null == svcHealthChkEntry) {
                            return 'Select service health check entry';
                        }
                        intfTypes.push(intfType);
                        svcHealthChks.push(svcHealthChkEntry);
                    }
                    if (intfTypes.length > 1) {
                        if (intfTypes.length != (_.uniq(intfTypes)).length) {
                            return 'Same interface types selected for ' +
                                'multiple service health check';
                        }
                        if (svcHealthChks.length !=
                            (_.uniq(svcHealthChks)).length) {
                            return 'Same service health check entries ' +
                                'selected for multiple interface types';
                        }
                    }
                },
                'routing_policy': function(val, attr, data) {
                    var svcTmpl = data.service_template;
                    var svcTmplObj =
                        svcInstUtils.getSvcTmplDetailsBySvcTmplStr(svcTmpl);
                    var tmplVer =
                        getValueByJsonPath(svcTmplObj,'service_template_properties;version',
                                           1);
                    if (1 == tmplVer) {
                        return;
                    }
                    var rtPolicys = data['rtPolicys'];
                    if (null == rtPolicys) {
                        return;
                    }
                    rtPolicys = rtPolicys.toJSON();
                    var len = rtPolicys.length;
                    var intfTypes = [];
                    var rtPolicyList = [];
                    for (var i = 0; i < len; i++) {
                        var intfType = rtPolicys[i]['interface_type']();
                        if (null == intfType) {
                            return 'Interface type is required for routing '+
                                'policy';
                        }
                        var entry =
                            rtPolicys[i]['routing_policy']();
                        if (null == entry) {
                            return 'Select routing policy in order';
                        }
                        intfTypes.push(intfType);
                    }
                    if (intfTypes.length > 1) {
                        if (intfTypes.length != (_.uniq(intfTypes)).length) {
                            return 'Same interface types selected for ' +
                                'multiple routing policy';
                        }
                    }
                },
                'virtualNetwork': function(val, attr, data) {
                    var svcTmpl = data.service_template;
                    var svcTmplObj =
                        svcInstUtils.getSvcTmplDetailsBySvcTmplStr(svcTmpl);
                    var svcTmplIntfs =
                        getValueByJsonPath(svcTmplObj,
                                           'service_template_properties;interface_type',
                                           []);
                    var version =
                        getValueByJsonPath(svcTmplObj,
                                           'service_template_properties;version',
                                           1);
                    var svcMode =
                        getValueByJsonPath(svcTmplObj,
                                           'service_template_properties;service_mode',
                                           null);
                    var interfaceCollection = data['interfaces'];
                    if (null == interfaceCollection) {
                        return;
                    }
                    var models = interfaceCollection['models'];
                    var len = interfaceCollection.length;
                    var errStr = "Auto Configured network not allowed";
                    var vnList = [];
                    for (var i = 0; i < len; i++) {
                        var attr = models[i]['attributes'];
                        var vn = attr['virtualNetwork']();
                        if ("" != vn) {
                            vnList.push(vn);
                        }
                        if ('management' !=
                             svcTmplIntfs[i]['service_interface_type']) {
                            if (('in-network' == svcMode) ||
                                ('in-network-nat' == svcMode) ||
                                ('other' ==
                                 svcTmplIntfs[i]['service_interface_type'])) {
                                if ("" == vn) {
                                    return errStr;
                                }
                            }
                        }
                        if (true == svcTmplIntfs[i]["static_route_enable"]) {
                            if ("" == vn) {
                                return errStr;
                            }
                        }
                    }
                    if (vnList.length != (_.uniq(vnList)).length) {
                        return 'Same virtual network assigned to multiple ' +
                            'interface types';
                    }
                },
                'interface': function(val, attr, data) {
                    var portTuples =
                        svcInstUtils.getPortTuples(data['display_name'],
                                                   data['portTuples']);
                    if (null == portTuples) {
                        return;
                    }
                    var cnt = portTuples.length;
                    var vmiListPerPortTuple = [];
                    for (var i = 0; i < cnt; i++) {
                        vmiListPerPortTuple[i] = [];
                        var vmis = portTuples[i]['vmis'];
                        if (null == vmis) {
                            continue;
                        }
                        var vmisCnt = vmis.length;
                        for (var j = 0; j < vmisCnt; j++) {
                            vmiListPerPortTuple[i].push(vmis[j]['uuid']);
                        }
                        var uniqVmisList = _.uniq(vmiListPerPortTuple[i]);
                        if (uniqVmisList.length !=
                            vmiListPerPortTuple[i].length) {
                            var errorStr = 'Same interface assigned for ' +
                                'multiple interface types';
                            if ((null != portTuples[i]['to']) &&
                                (null != portTuples[i]['to'][3])) {
                                errorStr += ' for port tuple ' +
                                    portTuples[i]['to'][3];
                            }
                            return errorStr;
                        }
                    }
                    var tmpVmiListPerPortTuple = _.flatten(vmiListPerPortTuple);
                    if (tmpVmiListPerPortTuple.length !=
                        (_.uniq(tmpVmiListPerPortTuple)).length) {
                        return 'One or more same interfaces assigned to ' +
                            'multiple port tuple';
                    }
                },
                'service_template': function(val, attr, data) {
                    if (null == val) {
                        return "Select Service Template";
                    }
                    var svcTmpl = getCookie('domain') + ":" +
                        val.split(' - [')[0];
                    var svcTmpls = $(gridElId).data('svcInstTmplts');
                    if (null == svcTmpls[svcTmpl]) {
                        return 'Service Template is not valid';
                    }
                    var tmpl = svcTmpls[svcTmpl];
                    var imgName =
                        getValueByJsonPath(tmpl,
                                           'service_template_properties;image_name',
                                           null);
                    var tmplVersion =
                        getValueByJsonPath(tmpl,
                                           'service_template_properties;version',
                                           1);
                    if (2 == tmplVersion) {
                        return;
                    }
                    if (null == imgName) {
                        return 'Image name not found for this template';
                    }
                    var svcVirtType =
                        getValueByJsonPath(tmpl,
                                           'service_template_properties;service_virtualization_type',
                                           null);
                    if ('physical-device' == svcVirtType) {
                        return;
                    }
                    var imgList = window.imageList;
                    var imgCnt = imgList.length;
                    for (var i = 0; i < imgCnt; i++) {
                        if (imgList[i]['name'] == imgName) {
                            break;
                        }
                    }
                    if (i == imgCnt) {
                        return 'Image not found as specified in template';
                    }
                }
            }
        },
        changePortTupleName: function() {
            var portTuples = this.model().get('portTuples');
            var svcInstName = this.model().get('display_name');
            if ((null == svcInstName) || (!svcInstName.trim().length)) {
                return;
            }
            var cnt = portTuples.length;
            for (var i = 0; i < cnt; i++) {
                var portTupleName = portTuples.models[i].get('portTupleName')();
                var splitArr = portTupleName.split('-port-tuple');
                if (2 == splitArr.length) {
                    splitArr[0] = svcInstName;
                    splitArr[2] = splitArr[1];
                    splitArr[1] = '-port-tuple';
                } else if (splitArr.length > 2) {
                    tmpPortTupleArr = [];
                    tmpPortTupleArr[0] = svcInstName;
                    tmpPortTupleArr[1] = '-port-tuple';
                    tmpPortTupleArr[2] = splitArr[splitArr.length - 1];
                    splitArr = tmpPortTupleArr;
                }
                portTuples.models[i].attributes.portTupleName(splitArr.join(''));
            }
        },
        formRoutingPolicyToDisplay: function(rtList, intfType) {
            if (!rtList.length) {
                return null;
            }
            var policyList = [];
            rtList.sort(function(entry1, entry2) {
                return entry1.seqId - entry2.seqId;
            });
            var entryObj = {};
            var cnt = rtList.length;
            for (var i = 0; i < cnt; i++) {
                policyList.push(rtList[i]['rtPolicy']);
            }
            entryObj['routing_policy'] = policyList.join(',');
            entryObj['interface_type'] = intfType;
            var types = [{text: 'left', id: 'left'},
                {text: 'right', id: 'right'}];
            entryObj['rtPolicyInterfaceTypesData'] = types;
            var newEntry = new RtPolicyModel(entryObj);
            return newEntry;
        },
        getBackRefsByType: function(modelConfig, type) {
            var svcInstProps = [];
            var backRefs = null;
            var modelType;
            var modelKey;
            var backRefsLen = 0;
            if ('interface_route_table' == type) {
                backRefs = modelConfig['interface_route_table_back_refs'];
                modelType = IntfRtTableModel;
                modelKey = 'intfRtTables';
            }
            if ('routing_policy' == type) {
                backRefs = modelConfig['routing_policy_back_refs'];
                modelType = RtPolicyModel;
                modelKey = 'rtPolicys';
            }
            if ('service_health_check' == type) {
                backRefs = modelConfig['service_health_check_back_refs'];
                modelType = SvcHealthChkModel;
                modelKey = 'svcHealtchChecks';
            }
            if ('route_aggregate' == type) {
                backRefs = modelConfig['route_aggregate_back_refs'];
                modelType = RtAggregateModel;
                modelKey = 'rtAggregates';
            }
            if (null != backRefs) {
                backRefsLen = backRefs.length;
            }
            var properties = [];
            var intfTypes = [];
            if ((null != modelConfig) &&
                (null != modelConfig['service_template'])) {
                var tmpl = modelConfig['service_template'];
                var intfTypeStrStart = tmpl.indexOf('(');
                var intfTypeStrEnd = tmpl.indexOf(')');
                intfTypes =
                    tmpl.substr(intfTypeStrStart + 1,
                                intfTypeStrEnd - intfTypeStrStart - 1);
                intfTypes = intfTypes.split(', ');
            }

            var intfTypesList = [];
            var intfCnt = intfTypes.length;
            for (var i = 0; i < intfCnt; i++) {
                intfTypesList.push({text: intfTypes[i], id: intfTypes[i]});
            }
            var intfTypeToBackRefsMap = {};
            var leftRtPolSeqList = [];
            var rightRtPolSeqList = [];
            var dataObjArr = [];
            if ((null != backRefs) && (backRefsLen > 0)) {
                for (var i = 0; i < backRefsLen; i++) {
                    var value = backRefs[i]['to'].join(':') +
                        '~~' + backRefs[i]['uuid'];
                    var intfType =
                        getValueByJsonPath(backRefs[i],
                                           'attr;interface_type', null);
                    if ('routing_policy' == type) {
                        var leftRtPolSeq =
                            getValueByJsonPath(backRefs[i],
                                               'attr;left_sequence', null);
                        var rightRtPolSeq =
                            getValueByJsonPath(backRefs[i],
                                               'attr;right_sequence', null);
                        if ((null == leftRtPolSeq) && (null == rightRtPolSeq)) {
                            continue;
                        }
                        if (null != leftRtPolSeq) {
                            leftRtPolSeqList.push({seqId: Number(leftRtPolSeq),
                                                  rtPolicy: value});
                        }
                        if (null != rightRtPolSeq) {
                            rightRtPolSeqList.push({seqId:
                                                   Number(rightRtPolSeq),
                                                   rtPolicy: value});
                        }
                    } else {
                        if (null == intfType) {
                            continue;
                        }
                    }
                    if (null == intfTypeToBackRefsMap[intfType]) {
                        intfTypeToBackRefsMap[intfType] = [];
                    }

                    intfTypeToBackRefsMap[intfType].push(value);
                    if ('service_health_check' == type) {
                        var entryObj = {};
                        entryObj[type] = value;
                        entryObj['interface_type'] = intfType;
                        entryObj['interfaceTypesData'] = intfTypesList;
                        var newEntry = new modelType(entryObj);
                        properties.push(newEntry);
                    }
                }
                if (leftRtPolSeqList.length > 0) {
                    var newEntry =
                        this.formRoutingPolicyToDisplay(leftRtPolSeqList,
                                                        'left');
                    properties.push(newEntry);
                }
                if (rightRtPolSeqList.length > 0) {
                    var newEntry =
                        this.formRoutingPolicyToDisplay(rightRtPolSeqList,
                                                        'right');
                    properties.push(newEntry);
                }
            }
            if (('routing_policy' != type) &&
                ('service_health_check' != type)) {
                for (var key in intfTypeToBackRefsMap) {
                    var entryObj = {};
                    entryObj[type] = intfTypeToBackRefsMap[key].join(',');
                    entryObj['interface_type'] = key;
                    entryObj['interfaceTypesData'] = intfTypesList;
                    var newEntry = new modelType(entryObj);
                    properties.push(newEntry);
                }
            }
            var collection = new Backbone.Collection(properties);
            modelConfig[modelKey] = collection;
            return modelConfig;
        },
        setVMIsByVN: function(modelConfig, vnName, intfType) {
            var pTuples = modelConfig.get('portTuples');
            var vmiList = [];
            if (null == pTuples) {
                return;
            }
            var portTuplesCnt = pTuples.length;
            for (var i = 0; i < portTuplesCnt; i++) {
                var portTupleIntfs =
                    pTuples.models[i].get('portTupleInterfaces')();
                var portTupleIntfsCnt = portTupleIntfs.length;
                for (var j = 0; j < portTupleIntfsCnt; j++) {
                    if (intfType == portTupleIntfs[j]['interfaceType']()()) {
                        if (window.vnVmiMaps[vnName]) {
                            vmiList = window.vnVmiMaps[vnName];
                        }
                        portTupleIntfs[j]['vmiListData']()(vmiList);
                        break;
                    }
                }
            }
            return;
        },
        formatModelConfig: function(modelConfig) {
            if (!window.svcTmplsFormatted.length) {
                showInfoWindow("No Service Template found.",
                               "Add Service Template");
                return null;
            }
            var self = this;
            var intfTypes = [];
            if ((null != modelConfig) &&
                (null != modelConfig['svcTmplDetails']) &&
                (null != modelConfig['svcTmplDetails'][0])) {
                var svcTmplDetails = modelConfig['svcTmplDetails'][0];
                var svcTmpl = {'service-template': svcTmplDetails};
                svcTmpl = svcInstUtils.svcTemplateFormatter(svcTmpl);
                modelConfig['service_template'] = svcTmpl;
                svcTmpl = {'service-template': svcTmplDetails};
                intfTypes = svcInstUtils.getSvcTmplIntfTypes(svcTmpl);
            } else {
                modelConfig['service_template'] =
                    window.svcTmplsFormatted[0]['id'];
                var tmpl = modelConfig['service_template'];
                var intfTypeStrStart = tmpl.indexOf('(');
                var intfTypeStrEnd = tmpl.indexOf(')');
                intfTypes =
                    tmpl.substr(intfTypeStrStart + 1,
                                intfTypeStrEnd - intfTypeStrStart - 1);
                intfTypes = intfTypes.split(', ');
                var svcTmplObjsByFqn = $(gridElId).data('svcInstTmplts');
                if (null != tmpl) {
                    var tmplFqn = getCookie('domain') + ':' +
                    tmpl.split(' - [')[0];
                    svcTmpl = {'service-template': svcTmplObjsByFqn[tmplFqn]};
                } else {
                    svcTmpl = null;
                }
            }
            var maxInst =
                getValueByJsonPath(modelConfig,
                                   'service_instance_properties;scale_out;max_instances',
                                   null);
            if (null != maxInst) {
                modelConfig['no_of_instances'] = maxInst;
            }
            var intfList =
                getValueByJsonPath(modelConfig,
                                   'service_instance_properties;interface_list',
                                   []);
            var svcTmpls = $(gridElId).data('svcInstTmplts');
            var tmpl = modelConfig['service_template'];
            var svcTmplFqn = getCookie('domain') + ":" +
                tmpl.split(' - [')[0];

            var tmplVer =
                getValueByJsonPath(svcTmpls[svcTmplFqn],
                                   'service_template_properties;version',
                                   1);
            if (!intfList.length) {
                var intfsCnt = intfTypes.length;
                var interfaeTypes = [];
                if ((null != svcTmpls) && (null != svcTmpls[svcTmplFqn])) {
                    interfaeTypes =
                        getValueByJsonPath(svcTmpls[svcTmplFqn],
                                           'service_template_properties;interface_type',
                                           []);
                }
                var interfaeTypesCnt = interfaeTypes.length;
                for (var i = 0; i < intfsCnt; i++) {
                    var intfType = intfTypes[i];
                    /*
                    var intfType =
                        intfTypes[i].replace(intfTypes[i][0],
                                             intfTypes[i][0].toUpperCase());
                    */
                    var vn = "";
                    if ((null != window.vnList) && (window.vnList.length > 0)) {
                        vn = svcInstUtils.getVNByTmplType(intfType, svcTmpl);
                        if (null == vn) {
                            vn = "";
                        } else {
                            vn = vn['id'];
                        }
                    }
                    intfList.push({virtual_network: vn});
                }
            }
            var interfacesModels = [];
            var interfacesCollectionModel;
            var cnt = intfTypes.length;
            for (var i = 0; i < cnt; i++) {
                var intfType = intfTypes[i];
                /*
                intfType = intfType.replace(intfType[0], intfType[0].toUpperCase());
                */
                var vnList = window.allVNList;
                if (2 == tmplVer) {
                    vnList = window.vnList;
                }
                var interfacesModel =
                    new InterfacesModel({interfaceType: intfType,
                                        virtualNetwork:
                                        intfList[i]['virtual_network'],
                                        interfaceIndex: i,
                                        interfaceData: intfList[i],
                                        allVNListData: vnList});
                interfacesModels.push(interfacesModel);
                interfacesModel.__kb.view_model.model().on('change:virtualNetwork',
                                                           function(model,
                                                                    newValue) {
                    self.setVMIsByVN(self.model(),
                                     newValue,
                                     model.get('interfaceType'));
                });
            }
            interfacesCollectionModel = new Backbone.Collection(interfacesModels);
            modelConfig['interfaces'] = interfacesCollectionModel;
            modelConfig.host_list = [{'text': 'ANY', 'id': 'ANY'}];

            var portTupleList = modelConfig['port_tuples'];
            var portTupleModels = [];
            var portTuplesCnt = 0;
            if (null != portTupleList) {
                portTuplesCnt = portTupleList.length;
            }
            var intfs =
                this.getInterfaceTypeVNMap(modelConfig['interfaces'].toJSON());
            for (var i = 0; i < portTuplesCnt; i++) {
                var portTupleModel =
                    new PortTupleModel({portTupleName:
                                            portTupleList[i]['to'][3],
                                        portTupleData:
                                            portTupleList[i],
                                        intfTypes: intfTypes,
                                        parentIntfs: intfs});
                portTupleModels.push(portTupleModel);
            }
            var portTuplesCollection = new Backbone.Collection(portTupleModels);
            modelConfig['portTuples'] = portTuplesCollection;
            this.getBackRefsByType(modelConfig, 'interface_route_table');
            this.getBackRefsByType(modelConfig, 'service_health_check');
            this.getBackRefsByType(modelConfig, 'routing_policy');
            this.getBackRefsByType(modelConfig, 'route_aggregate');

            return modelConfig;
        },
        deleteModelCollectionData: function(model, type) {
            var collection = model.attributes[type];
            var len = collection.length;
            for (var i = 0; i < len; i++) {
                collection.remove(collection.models[i]);
                len--;
                i--;
            }
        },
        formatModelConfigColl: function(intfTypes, isDisabled) {
            if (true == isDisabled) {
                return;
            }
            var self = this;
            var cnt = intfTypes.length;
            var svcTmpl = this.model().get('service_template');
            var svcTmpls = $(gridElId).data('svcInstTmplts');
            var svcTmplFqn = getCookie('domain') + ":" +
                svcTmpl.split(' - [')[0];
            var svcTmplObj = {'service-template': svcTmpls[svcTmplFqn]};

            var tmplVer = getValueByJsonPath(svcTmpls[svcTmplFqn],
                                             'service_template_properties;version',
                                             1);
            this.deleteModelCollectionData(this.model(), 'interfaces');
            this.deleteModelCollectionData(this.model(), 'portTuples');
            this.deleteModelCollectionData(this.model(), 'svcHealtchChecks');
            this.deleteModelCollectionData(this.model(), 'intfRtTables');
            this.deleteModelCollectionData(this.model(), 'rtPolicys');
            this.deleteModelCollectionData(this.model(), 'rtAggregates');
            var interfaces = this.model().attributes['interfaces'];
            for (var i = 0; i < cnt; i++) {
                var intfType = intfTypes[i];
                /*
                var intfType =
                    intfTypes[i].replace(intfTypes[i][0],
                                         intfTypes[i][0].toUpperCase());
                */
                var vn = null;
                /*
                if ((null != window.vnList) && (window.vnList.length > 0)) {
                    vn = svcInstUtils.getVNByTmplType(intfTypes[i], svcTmplObj);
                    if (null != vn) {
                        vn = vn['id'];
                    }
                }
                */
                var intfList =
                    getValueByJsonPath(this.model().attributes,
                                       'service_instance_properties;interface_list',
                                       []);
                var vnList = window.allVNList;
                if (2 == tmplVer) {
                    vnList = window.vnList;
                }
                var newInterface =
                    new InterfacesModel({'interfaceType': intfType,
                                        'virtualNetwork': vn,
                                        'interfaceIndex': i,
                                        interfaceData: intfList[i],
                                        allVNListData: vnList});
                newInterface.__kb.view_model.model().on('change:virtualNetwork',
                                                           function(model,
                                                                    newValue) {
                    self.setVMIsByVN(self.model(),
                                     newValue,
                                     model.get('interfaceType'));
                });

                kbValidation.bind(this.editView,
                                  {collection:
                                  newInterface.model().attributes.staticRoutes});
                interfaces.add([newInterface]);
            }
            return;
        },
        addPortTuple: function() {
            var svcInstName = this.model().get('display_name');
            if ((null == svcInstName) || (!svcInstName.trim().length)) {
                var model = this.model();
                var attr = cowu.getAttributeFromPath('display_name');
                var errors = model.get(cowc.KEY_MODEL_ERRORS);
                var attrErrorObj = {}
                attrErrorObj[attr + cowc.ERROR_SUFFIX_ID] =
                    'Service Instance Name is required';
                errors.set(attrErrorObj);
                return;
            }
            /* Why this function gets called, even when the port_tuple stuff
               in invisible
             */
            var svcTmpl = this.model().get('service_template');
            var svcTmpls = $(gridElId).data('svcInstTmplts');
            var svcTmplFqn = getCookie('domain') + ":" +
                svcTmpl.split(' - [')[0];
            var tmplVer = getValueByJsonPath(svcTmpls[svcTmplFqn],
                                             'service_template_properties;version',
                                             1);
            if (1 == tmplVer) {
                return;
            }
            var portTupleCollection = this.model().get('portTuples');
            var collLen = portTupleCollection.length;
            var models = portTupleCollection['models'];
            var portTupleIds = [];
            var tmpPortTupleId = 0;
            for (var i = 0; i < collLen; i++) {
                var attr = models[i].attributes;
                var ptName = attr.portTupleName();
                var splitArr = ptName.split(svcInstName + '-port-tuple');
                if (2 == splitArr.length) {
                    tmpPortTupleId = Number(splitArr[1].split('-')[0]);
                    portTupleIds.push(tmpPortTupleId);
                }
            }
            if (portTupleIds.length > 0) {
                portTupleIds.sort();
                var portTupleIdsCnt = portTupleIds.length;
                if (portTupleIds[portTupleIdsCnt - 1] == (portTupleIdsCnt - 1)) {
                    tmpPortTupleId = portTupleIdsCnt;
                } else {
                    for (var i = 0; i < portTupleIdsCnt; i++) {
                        if (i != portTupleIds[i]) {
                            tmpPortTupleId = i;
                            break;
                        }
                    }
                    if (i == portTupleIdsCnt) {
                        /* We must not come here */
                        tmpPortTupleId = portTupleIdsCnt;
                    }
                }
            }
            var newUUID = UUIDjs.create();
            var portTupleName = svcInstName + '-port-tuple' +
                tmpPortTupleId.toString() + '-' + newUUID['hex'];
            var intfs =
                this.getInterfaceTypeVNMap(this.model().get('interfaces').toJSON());
            var newPortTupleEntry =
                new PortTupleModel({portTupleName: portTupleName,
                                   portTupleData: {},
                                   intfTypes: this.getIntfTypes(true),
                                   parentIntfs: intfs});

            kbValidation.bind(this.editView,
                               {collection:
                               newPortTupleEntry.model().attributes.portTupleInterfaces});
            portTupleCollection.add([newPortTupleEntry]);
        },
        getInterfaceTypeVNMap: function(intfData) {
            var intfObjs = {};
            if (null == intfData) {
                return intfs;
            }
            var cnt = intfData.length;
            for (var i = 0; i < cnt; i++) {
                var intfType = intfData[i]['interfaceType']();
                var vn = intfData[i]['virtualNetwork']();
                intfObjs[intfType] = vn;
            }
            return intfObjs;
        },
        getIntfTypes: function(isRaw) {
            var tmpl =
                $('#service_template_dropdown').data('contrailDropdown').value();
            var intfTypeStrStart = tmpl.indexOf('(');
            var intfTypeStrEnd = tmpl.indexOf(')');
            var itfTypes =
                tmpl.substr(intfTypeStrStart + 1,
                            intfTypeStrEnd -
                            intfTypeStrStart - 1);
            var intfTypes = itfTypes.split(', ');
            if (isRaw) {
                return intfTypes;
            }
            var cnt = intfTypes.length;
            var types = [];
            for (var i = 0; i < cnt; i++) {
                types.push({text: intfTypes[i], id: intfTypes[i]});
            }
            return types;
        },
        addPropSvcHealthChk: function() {
            var svcHealtchChecks = this.model().get('svcHealtchChecks');
            var svcHealthChkEntry = null;
            var types = this.getIntfTypes(false);
            var newEntry =
                new SvcHealthChkModel({service_health_check: null,
                                       interface_type: null,
                                       interfaceTypesData: types});
            svcHealtchChecks.add([newEntry]);
        },
        addPropIntfRtTable: function() {
            var intfRtTables = this.model().get('intfRtTables');
            var types = this.getIntfTypes(false);
            var newEntry =
                new IntfRtTableModel({interface_route_table: null,
                                      interface_type: null,
                                      interfaceTypesData: types});
            intfRtTables.add([newEntry]);
        },
        addPropRtPolicy: function() {
            var rtPolicys = this.model().get('rtPolicys');
            var types = [{text: 'left', id: 'left'},
                {text: 'right', id: 'right'}];
            var newEntry =
                new RtPolicyModel({routing_policy: null,
                                   interface_type: null,
                                   rtPolicyInterfaceTypesData: types});
            rtPolicys.add([newEntry]);
        },
        addPropRtAggregate: function() {
            var rtAggregates = this.model().get('rtAggregates');
            var rtAgg = "";
            var types = this.getIntfTypes(false);
            var newEntry =
                new RtAggregateModel({route_aggregate: null,
                                      interface_type: null,
                                      interfaceTypesData: types});
            rtAggregates.add([newEntry]);
        },
        deleteSvcInstProperty: function(data, property) {
            var collection = data.model().collection;
            var entry = property.model();
            collection.remove(entry);
        },
        getHostListByZone: function() {
            var self = this;
            return ko.computed(function () {
                return window.hostListByZone;
            }, this);
        },
        showHideStaticRTs: function(interfaceIndex) {
            var idx = interfaceIndex();
            var tmplStr = this.model().get('service_template');
            if (null == tmplStr) {
                return false;
            }
            tmplStr = tmplStr.trim();
            tmplStr = contrail.getCookie('domain') + ":" + tmplStr.split(' - [')[0];
            var tmplData = $(gridElId).data('svcInstTmplts');
            if (null == tmplData[tmplStr]) {
                return false;
            }
            var intfType =
                getValueByJsonPath(tmplData[tmplStr],
                                   'service_template_properties;interface_type',
                                   []);
            var tmplVersion =
                getValueByJsonPath(tmplData[tmplStr],
                                   'service_template_properties;version', 1);
            if (2 == tmplVersion) {
                return false;
            }
            if (null != intfType[idx]) {
                return intfType[idx]['static_route_enable'];
            }
            return false;
        },
        getSIProperties: function() {
            var siProp = {};
            var intfList = [];
            var stVersion;
            var sTemplate = getValueByJsonPath(this.model().attributes,
                "service_template", "");
            stVersion = sTemplate.split('] - ')[1];
            var coll = this.model().attributes.interfaces;
            var len = coll.length;
            var models = coll['models'];
            for (var i = 0; i < len; i++) {
                var attr = models[i]['attributes'];
                intfList[i] = {};
                var vn = attr['virtualNetwork']();
                var intfType = attr['interfaceType']();
                intfList[i]['virtual_network'] = vn;
                /* Now check if we have Static RTs */
                if ('right' == intfType) {
                    siProp['right_virtual_network'] = vn;
                }
                if ('left' == intfType) {
                    siProp['left_virtual_network'] = vn;
                }
                if ('management' == intfType) {
                    siProp['management_virtual_network'] = vn;
                }
                if ('v2' == stVersion) {
                    continue;
                }
                var staticRTs = attr.staticRoutes();
                var staticRTsCnt = staticRTs.length;
                for (var j = 0; j < staticRTsCnt; j++) {
                    if (0 == j) {
                        intfList[i]['static_routes'] = {'route': []};
                    }
                    var staticRTAttr = staticRTs[j].model().attributes;
                    var commAttrs = staticRTAttr['community_attributes']();
                    var arr = commAttrs.split('\n');
                    var arrLen = arr.length;
                    var commAttrArr = [];
                    for (var k = 0; k < arrLen; k++) {
                        if (null == arr[k]) {
                            continue;
                        }
                        var tmpArr = arr[k].split(',');
                        if (tmpArr.length > 0) {
                            var arrLen = tmpArr.length;
                            for (var l = 0; l < arrLen; l++) {
                                if (tmpArr[l].length > 0) {
                                    commAttrArr.push(tmpArr[l].trim());
                                }
                            }
                        }
                    }
                    var routeObj = {'prefix': staticRTAttr['prefix'](),
                        'next_hop': null, 'next_hop_type': null,
                        'community_attributes': {
                            'community_attribute': commAttrArr
                        }
                    };
                    intfList[i]['static_routes']
                        ['route'].push($.extend({}, true, routeObj));
                }
            }
            var siP = this.model().get('service_instance_properties');
            if ((null != siP) && (null != siP['ha_mode'])) {
                if (("" != siP['ha_mode']) && ('v2' != stVersion)) {
                    siProp['ha_mode'] = siP['ha_mode'];
                }
            }
            siProp['interface_list'] = intfList;
            return siProp;
        },
        getSvcInstProperties: function() {
            var propObjs = {};
            var list =
                this.getSvcInstPropertiesByType('interface_route_table_back_refs');
            if ((null != list) && (list.length > 0)) {
                propObjs['interface_route_table_back_refs'] =
                    list;
            } else {
                propObjs['interface_route_table_back_refs'] = [];
            }

            list =
                this.getSvcInstPropertiesByType('service_health_check_back_refs');
            if ((null != list) && (list.length > 0)) {
                propObjs['service_health_check_back_refs'] = list;
            } else {
                propObjs['service_health_check_back_refs'] = [];
            }

            list =
                this.getSvcInstPropertiesByType('route_aggregate_back_refs');
            if ((null != list) && (list.length > 0)) {
                propObjs['route_aggregate_back_refs'] = list;
            }else {
                propObjs['route_aggregate_back_refs'] = [];
            }

            list =
                this.getSvcInstPropertiesByType('routing_policy_back_refs');
            if ((null != list) && (list.length > 0)) {
                propObjs['routing_policy_back_refs'] = list;
            } else {
                propObjs['routing_policy_back_refs'] = [];
            }
            return propObjs;
        },
        getSvcInstPropertiesByType: function(backRefKey) {
            var collKey;
            var type;
            var propList = [];
            if ('interface_route_table_back_refs' == backRefKey) {
                type = 'interface_route_table';
                collKey = 'intfRtTables';
            }
            if ('service_health_check_back_refs' == backRefKey) {
                type = 'service_health_check';
                collKey = 'svcHealtchChecks';
            }
            if ('route_aggregate_back_refs' == backRefKey) {
                type = 'route_aggregate';
                collKey = 'rtAggregates';
            }
            if ('routing_policy_back_refs' == backRefKey) {
                type = 'routing_policy';
                collKey = 'rtPolicys';
            }
            var collection = this.model().get(collKey);
            var len = collection.length;
            var models = collection['models'];
            var leftSeqId = 1;
            var rightSeqId = 1;
            var tmpRtPolicyObjs = {};
            var tmpLeftPolicyObjs = {};
            for (var i = 0; i < len; i++) {
                var modelAttr = models[i]['attributes'];
                var intfType = modelAttr['interface_type']();
                var propValue = modelAttr[type]();
                if (null == propValue) {
                    propValue = "";
                }
                var values = propValue.split(',');
                var valCnt = values.length;
                for (var j = 0; j < valCnt; j++) {
                    var attr = {};
                    if ((null != values[j]) && ("" != values[j])) {
                        var data = values[j].split('~~');
                        if ((null != data[0]) && (null != data[1]) &&
                            ("" != data[0]) && ("" != data[1])) {
                            if ('routing_policy_back_refs' == backRefKey) {
                                if ('left' == intfType) {
                                    var propListIdx = tmpRtPolicyObjs[data[1]];
                                    if (null != propListIdx) {
                                        propList[propListIdx]['attr']['left_sequence']
                                            = leftSeqId.toString();
                                        leftSeqId++;
                                        continue;
                                    } else {
                                        attr['left_sequence'] =
                                            leftSeqId.toString();
                                        leftSeqId++;
                                    }
                                    tmpLeftPolicyObjs[data[1]] =
                                        propList.length;
                                } else {
                                    var propListIdx =
                                        tmpLeftPolicyObjs[data[1]];
                                    if (null != propListIdx) {
                                        propList[propListIdx]['attr']['right_sequence']
                                            = rightSeqId.toString();
                                        rightSeqId++;
                                        continue;
                                    } else {
                                        attr['right_sequence'] =
                                            rightSeqId.toString();
                                        rightSeqId++;
                                    }
                                    tmpRtPolicyObjs[data[1]] =
                                        propList.length;
                                }
                            } else {
                                attr = {'interface_type': intfType};
                            }
                            var backRefObj = {'to': data[0].split(':'), 'attr': attr,
                                'uuid': data[1]};
                            propList.push(backRefObj);
                        }
                    }
                }
            }
            return propList;
        },
        deepValidationList: function () {
            var validationList = [{
                key: null,
                type: cowc.OBJECT_TYPE_MODEL,
                getValidation: 'svcInstValidations',
            },
            {
                key: 'portTuples',
                type: cowc.OBJECT_TYPE_COLLECTION,
                getValidation: 'portTuplesValidation',
            },
            {
                key: 'svcHealtchChecks',
                type: cowc.OBJECT_TYPE_COLLECTION,
                getValidation: 'svcHealtchChecksValidation',
            },
            {
                key: 'intfRtTables',
                type: cowc.OBJECT_TYPE_COLLECTION,
                getValidation: 'intfRtTablesValidation',
            },
            {
                key: 'rtPolicys',
                type: cowc.OBJECT_TYPE_COLLECTION,
                getValidation: 'rtPolicysValidation',
            },
            {
                key: 'rtAggregates',
                type: cowc.OBJECT_TYPE_COLLECTION,
                getValidation: 'rtAggregatesValidation',
            },
            {
                key: 'interfaces',
                type: cowc.OBJECT_TYPE_COLLECTION,
                getValidation: 'interfacesValidation',
            },
            {
                key: ['portTuples', 'portTupleInterfaces'],
                type: cowc.OBJECT_TYPE_COLLECTION_OF_COLLECTION,
                getValidation: 'portTupleInterfacesValidation'
            },
            {
                key: ['interfaces', 'staticRoutes'],
                type: cowc.OBJECT_TYPE_COLLECTION_OF_COLLECTION,
                getValidation: 'staticRoutesValidation'
            }];
            return validationList;
        },
        configureSvcInst: function (isEdit, dataItem, callbackObj) {
            var ajaxConfig = {}, returnFlag = false;
            var putData = {};

            var validationList = this.deepValidationList();
            if (this.isDeepValid(validationList)) {
                var locks = this.model().attributes.locks.attributes;
                var newSvcInst =
                    $.extend({}, true, this.model().attributes);
                var siProp = this.getSIProperties();
                var portTuples =
                    svcInstUtils.getPortTuples(newSvcInst['display_name'],
                                               this.model().get('portTuples'));
                newSvcInst['port_tuples'] = [];
                if (portTuples.length > 0) {
                    newSvcInst['port_tuples'] = portTuples;
                }
                newSvcInst['service_instance_properties'] = siProp;
                var svcProp = this.getSvcInstProperties();
                for (key in svcProp) {
                    newSvcInst[key] = svcProp[key];
                }
                var tmpl =
                    newSvcInst['service_template'].split(' - [')[0];
                newSvcInst['service_template_refs'] = [];
                newSvcInst['service_template_refs'][0] = {};
                newSvcInst['service_template_refs'][0]['to'] =
                    [getCookie('domain'), tmpl];
                newSvcInst['parent_type'] = 'project';
                newSvcInst['parent_uuid'] =
                    window.projectDomainData.value;
                var svcTmpls = $(gridElId).data('svcInstTmplts');
                var svcTmplFqn =
                    newSvcInst['service_template_refs'][0]['to'].join(':');
                var svcTmplVersion = 1;
                if (null != svcTmpls[svcTmplFqn]) {
                    newSvcInst['svcTmplDetails'] = [];
                    newSvcInst['svcTmplDetails'][0] = svcTmpls[svcTmplFqn];
                    svcTmplVersion =
                        getValueByJsonPath(svcTmpls[svcTmplFqn],
                                           'service_template_properties;version',
                                           1);
                }
                newSvcInst['fq_name'] =
                    [getCookie('domain'), getCookie('project'),
                    newSvcInst['display_name']];
                if (1 == svcTmplVersion) {
                    newSvcInst['service_instance_properties']['scale_out'] = {};
                    newSvcInst['service_instance_properties']['scale_out']
                        ['max_instances'] =
                        parseInt(newSvcInst['no_of_instances']);
                }
                var availZone = "";
                if ('ANY' != newSvcInst['availability_zone']) {
                    availZone = newSvcInst['availability_zone'];
                }
                if ('ANY' != newSvcInst['host']) {
                    availZone += ':' + newSvcInst['host'];
                }
                if ("" != availZone) {
                    newSvcInst['service_instance_properties']
                        ['availability_zone'] = availZone;
                }
                delete newSvcInst['interfaces'];
                delete newSvcInst['host_list'];
                delete newSvcInst['service_template'];
                delete newSvcInst['status'];
                delete newSvcInst['statusDetails'];
                delete newSvcInst['no_of_instances'];
                delete newSvcInst['availability_zone'];
                delete newSvcInst['host'];
                delete newSvcInst['portTuples'];
                delete newSvcInst['intfRtTables'];
                delete newSvcInst['svcHealtchChecks'];
                delete newSvcInst['rtPolicys'];
                delete newSvcInst['rtAggregates'];

                if (null == newSvcInst['uuid']) {
                    delete newSvcInst['uuid'];
                }
                ajaxConfig = {};
                ctwu.deleteCGridData(newSvcInst);
                var putData = {'service-instance': newSvcInst};
                ajaxConfig.url = '/api/tenants/config/service-instances';
                if (true == isEdit) {
                    ajaxConfig.type = "PUT";
                    ajaxConfig.url += '/' + newSvcInst['uuid'];
                } else {
                    ajaxConfig.type = "POST";
                }
                ajaxConfig.data = JSON.stringify(putData);
                contrail.ajaxHandler(ajaxConfig, function () {
                    if (contrail.checkIfFunction(callbackObj.init)) {
                        callbackObj.init();
                    }
                }, function (response) {
                    if (contrail.checkIfFunction(callbackObj.success)) {
                        callbackObj.success();
                    }
                    returnFlag = true;
                }, function (error) {
                    if (contrail.checkIfFunction(callbackObj.error)) {
                        callbackObj.error(error);
                    }
                    returnFlag = false;
                });
            } else {
                if (contrail.checkIfFunction(callbackObj.error)) {
                    callbackObj.error(this.getFormErrorText(ctwl.SERVICE_INSTANCES_PREFIX_ID));
                }
            }
            return returnFlag;
        },
        deleteSvcInst: function(checkedRows, callbackObj) {
            var returnFlag = false;
            var ajaxConfig = {};
            var uuidList = [];
            var cnt = checkedRows.length;

            var userData = {};
            var deleteObjsList = [];
            for (var i = 0; i < cnt; i++) {
                userData['port_tuples'] =
                    getValueByJsonPath(checkedRows[i], 'port_tuples', []);
                userData['template_version'] = 1;
                if ('svcTmplDetails' in checkedRows[i]) {
                    if (null != checkedRows[i]['svcTmplDetails'][0]) {
                        userData['template_version'] =
                            getValueByJsonPath(checkedRows[i]['svcTmplDetails'][0],
                                               'service_template_properties;version',
                                               1);
                    }
                }
                userData['interface_route_table_back_refs'] =
                    checkedRows[i]['interface_route_table_back_refs'];
                userData['service_health_check_back_refs'] =
                    checkedRows[i]['service_health_check_back_refs'];
                userData['routing_policy_back_refs'] =
                    checkedRows[i]['routing_policy_back_refs'];
                userData['route_aggregate_back_refs'] =
                    checkedRows[i]['route_aggregate_back_refs'];
                deleteObjsList.push(JSON.parse(JSON.stringify({'type': 'service-instance',
                                    'deleteIDs': [checkedRows[i]['uuid']],
                                    'userData': userData})));
            }
            ajaxConfig.type = "POST";
            ajaxConfig.data = JSON.stringify(deleteObjsList);
            ajaxConfig.url = '/api/tenants/config/delete';
            contrail.ajaxHandler(ajaxConfig, function () {
                if (contrail.checkIfFunction(callbackObj.init)) {
                    callbackObj.init();
                }
            }, function (response) {
                if (contrail.checkIfFunction(callbackObj.success)) {
                    callbackObj.success();
                }
                returnFlag = true;
            }, function (error) {
                if (contrail.checkIfFunction(callbackObj.error)) {
                    callbackObj.error(error);
                }
                returnFlag = false;
            });
            return returnFlag;
        }
    });
    return SvcInstModel;
});

