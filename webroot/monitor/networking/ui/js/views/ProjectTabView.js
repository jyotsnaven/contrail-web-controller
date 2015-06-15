/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'backbone'
], function (_, Backbone) {
    var ProjectTabView = Backbone.View.extend({
        el: $(contentContainer),

        render: function () {
            var self = this,
                viewConfig = this.attributes.viewConfig;

            cowu.renderView4Config(self.$el, null, getProjectViewConfig(viewConfig));
        }

    });

    var getProjectViewConfig = function (viewConfig) {
        var projectFQN = viewConfig['projectFQN'],
            projectUUID = viewConfig['projectUUID'];

        return {
            elementId: cowu.formatElementId([ctwl.MONITOR_PROJECT_VIEW_ID, '-section']),
            view: "SectionView",
            viewConfig: {
                rows: [
                    {
                        columns: [
                            {
                                elementId: ctwl.PROJECT_TABS_ID,
                                view: "TabsView",
                                viewConfig: {
                                    theme: 'classic',
                                    activate: function (e, ui) {
                                        var selTab = $(ui.newTab.context).text();
                                        if (selTab == ctwl.TITLE_PORT_DISTRIBUTION) {
                                            $('#' + ctwl.PROJECT_PORTS_SCATTER_CHART_ID).trigger('refresh');
                                        } else if (selTab == ctwl.TITLE_NETWORKS) {
                                            $('#' + ctwl.PROJECT_NETWORK_GRID_ID).data('contrailGrid').refreshView();
                                        } else if (selTab == ctwl.TITLE_INSTANCES) {
                                            $('#' + ctwl.PROJECT_INSTANCE_GRID_ID).data('contrailGrid').refreshView();
                                        }
                                    },
                                    tabs: [
                                        {
                                            elementId: ctwl.PROJECT_NETWORKS_ID,
                                            title: ctwl.TITLE_NETWORKS,
                                            view: "NetworkGridView",
                                            app: cowc.APP_CONTRAIL_CONTROLLER,
                                            viewConfig: {
                                                projectFQN: projectFQN,
                                                parentType: 'project'
                                            }
                                        },
                                        {
                                            elementId: ctwl.PROJECT_INSTANCES_ID,
                                            title: ctwl.TITLE_INSTANCES,
                                            view: "InstanceGridView",
                                            app: cowc.APP_CONTRAIL_CONTROLLER,
                                            viewConfig: {
                                                parentUUID: projectUUID,
                                                parentType: 'project'
                                            }
                                        },
                                        {
                                            elementId: ctwl.PROJECT_PORTS_SCATTER_CHART_ID,
                                            title: ctwl.TITLE_PORT_DISTRIBUTION,
                                            view: "ZoomScatterChartView",
                                            viewConfig: {
                                                modelConfig: {
                                                    remote: {
                                                        ajaxConfig: {
                                                            url: ctwc.get(ctwc.URL_PORT_DISTRIBUTION, projectFQN),
                                                            type: 'GET'
                                                        },
                                                        dataParser: ctwp.projectVNPortStatsParser
                                                    },
                                                    cacheConfig: {
                                                        ucid: ctwc.get(ctwc.UCID_PROJECT_VN_PORT_STATS_LIST, projectFQN)
                                                    }
                                                },
                                                chartOptions: {
                                                    xLabel: ctwl.X_AXIS_TITLE_PORT,
                                                    yLabel: ctwl.Y_AXIS_TITLE_BW,
                                                    forceX: [0, 1000],
                                                    dataParser: function (responseArray) {
                                                        var response = responseArray[0],
                                                            srcPortdata  = response ? ctwp.parsePortDistribution(ifNull(response['sport'], []), {
                                                                startTime: response['startTime'],
                                                                endTime: response['endTime'],
                                                                bandwidthField: 'outBytes',
                                                                flowCntField: 'outFlowCount',
                                                                portField: 'sport',
                                                                portYype: "src",
                                                                fqName: projectFQN
                                                            }) : [],
                                                            dstPortData = response ? ctwp.parsePortDistribution(ifNull(response['dport'], []), {
                                                                startTime: response['startTime'],
                                                                endTime: response['endTime'],
                                                                bandwidthField: 'inBytes',
                                                                flowCntField: 'inFlowCount',
                                                                portField: 'dport',
                                                                portYype: "src",
                                                                fqName: projectFQN
                                                            }) : [],
                                                            chartData = [];

                                                        chartData = chartData.concat(srcPortdata);
                                                        chartData = chartData.concat(dstPortData);

                                                        return chartData;
                                                    },
                                                    tooltipConfigCB: ctwgrc.getPortDistributionTooltipConfig(onScatterChartClick),
                                                    clickCB: onScatterChartClick,
                                                    sizeFieldName: 'flowCnt',
                                                    xLabelFormat: d3.format(','),
                                                    yLabelFormat: function(yValue) {
                                                        var formattedValue = formatBytes(yValue, false, null, 1);
                                                        return formattedValue;
                                                    },
                                                    margin: {left: 70}
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        }
    };

    var onScatterChartClick = function(chartConfig) {
        var obj= {
            type: 'flow',
            view: 'list',
            fqName:chartConfig['fqName'],
            port:chartConfig['range']
        };
        if(chartConfig['startTime'] != null && chartConfig['endTime'] != null) {
            obj['startTime'] = chartConfig['startTime'];
            obj['endTime'] = chartConfig['endTime'];
        }

        if(chartConfig['type'] == 'sport')
            obj['portType']='src';
        else if(chartConfig['type'] == 'dport')
            obj['portType']='dst';

        layoutHandler.setURLHashParams(obj, {p:"mon_networking_projects", merge:false});
    };


    return ProjectTabView;
});
