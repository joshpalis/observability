/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './config_panel.scss';

import React, { useContext, useMemo, useState, useEffect } from 'react';
import { isEmpty } from 'lodash';
import hjson from 'hjson';
import Mustache from 'mustache';
import { batch, useDispatch, useSelector } from 'react-redux';
import { EuiTabbedContent, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import {
  selectVisualizationConfig,
  change as changeVisualizationConfig,
} from '../../slices/viualization_config_slice';
import { ConfigEditor } from './config_editor/config_editor';
import { getDefaultSpec } from '../visualization_specs/default_spec';
import { VizDataPanel } from './config_raw_data/config_raw_data';
import { TabContext } from '../../hooks';
import { DefaultEditorControls } from './DefaultEditorControls';

const CONFIG_LAYOUT_TEMPLATE = `
{
  "layout": {},
  "config": {
    "scrollZoom": {{config.scrollZoom}},
    "editable": {{config.editable}},
    "staticPlot": {{config.staticPlot}},
    "displayModeBar": {{config.displayModeBar}},
    "responsive": {{config.responsive}},
    "doubleClickDelay": {{config.doubleClickDelay}}
  }
}
`;

const HJSON_PARSE_OPTIONS = {
  keepWsc: true,
};

const HJSON_STRINGIFY_OPTIONS = {
  keepWsc: true,
  condense: 1,
  bracesSameLine: true,
};

export const ConfigPanel = ({ vizVectors }: any) => {
  const {
    tabId,
    curVisId,
    dispatch,
    changeVisualizationConfig,
    explorerVisualizations,
    setToast,
  } = useContext(TabContext);
  const customVizConfigs = useSelector(selectVisualizationConfig)[tabId];
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [xaxis, setXaxis] = useState([]);
  const [yaxis, setYaxis] = useState([]);
  useEffect(() => {
    const labelAddedFields = explorerVisualizations?.metadata?.fields.map((field) => {
      return {
        ...field,
        label: field.name,
      };
    });
    const needsRotate = curVisId === 'horizontal_bar';
    if (labelAddedFields) {
      if (needsRotate) {
        setXaxis(labelAddedFields.slice(0, labelAddedFields.length - 1));
        setYaxis([labelAddedFields[labelAddedFields.length - 1]]);
      } else {
        setYaxis(labelAddedFields.slice(0, labelAddedFields.length - 1));
        setXaxis([labelAddedFields[labelAddedFields.length - 1]]);
      }
    }
    
  }, [explorerVisualizations]);

  const handleConfigUpdate = (payload) => {
    console.log('payload:', payload);
    try {
      dispatch(
        changeVisualizationConfig({
          tabId,
          data: {
            xaxis,
            yaxis,
          },
          // data: {
          //   ...payload,
          // },
        })
      );
    } catch (e) {
      setToast(`Invalid visualization configurations. error: ${e.message}`, 'danger');
    }
  };

  const handleDataConfigChange = (hjsonConfig) => {
    const payload = {
      data: [...hjson.parse(hjsonConfig, HJSON_PARSE_OPTIONS)],
    };
    handleConfigUpdate(payload);
  };

  const handleLayoutConfigChange = (hjsonConfig) => {
    const jsonConfig = hjson.parse(hjsonConfig, HJSON_PARSE_OPTIONS);
    console.log('jsonConfig: ', jsonConfig);
    const output = Mustache.render(CONFIG_LAYOUT_TEMPLATE, jsonConfig);
    // const renderedConfig = Mustache.render(CONFIG_TEMPLATE, { ...jsonConfig.config });
    console.log('typeof output: ', typeof output);
    // console.log('JSON.parse(renderedConfig): ', JSON.parse(renderedConfig));
    try {
      const payload = {
        ...JSON.parse(output),
        // ...Object(renderedConfig),
      };
      handleConfigUpdate(payload);
    } catch (e) {
      console.log(e.message);
    }
  };

  // const getSpec = (jsonSpec) => {
  //   if (isEmpty()) return getDefaultSpec();
  //   return {

  //   };
  // };

  const tabs = useMemo(() => {
    return [
      {
        id: 'style-panel',
        name: 'Layout',
        content: (
          <ConfigEditor
            // customVizConfigs={customVizConfigs}
            onConfigUpdate={handleLayoutConfigChange}
            // spec={getDefaultSpec(customVizConfigs)}
            spec={
              customVizConfigs?.layout || customVizConfigs?.config
                ? hjson.stringify(
                    {
                      layout: { ...customVizConfigs?.layout },
                      config: { ...customVizConfigs?.config },
                    },
                    HJSON_STRINGIFY_OPTIONS
                  )
                : getDefaultSpec('layout')
            }
            setToast={setToast}
          />
        ),
      },
      {
        id: 'data-panel',
        name: 'Data',
        content: (
          <VizDataPanel
            queriedVizRes={explorerVisualizations}
            customVizConfigs={customVizConfigs}
            curVisId={curVisId}
            onConfigUpdate={handleConfigUpdate}
            xaxis={xaxis}
            yaxis={yaxis}
            setXaxis={setXaxis}
            setYaxis={setYaxis}
          />
        ),
      },
    ];
  }, [explorerVisualizations, curVisId, setToast, handleLayoutConfigChange]);

  const onClickCollapse = () => {
    setIsCollapsed((staleState) => !staleState);
  };

  return (
    <>
      <EuiFlexGroup
        className="visEditorSidebar"
        direction="column"
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiTabbedContent
            id="vis-config-tabs"
            tabs={tabs}
            initialSelectedTab={tabs[0]}
            autoFocus="selected"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DefaultEditorControls isDirty={true} isInvalid={false} onConfigUpdate={handleConfigUpdate} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
