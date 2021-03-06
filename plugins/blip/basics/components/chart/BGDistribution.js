/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2015 Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

 /* jshint esversion:6 */

var _ = require('lodash');
var cx = require('classnames');
var d3 = require('d3');
var React = require('react');
var Toggle = require('../misc/Toggle');

var bgBars = require('./BGBars');
var constants = require('../../logic/constants');

var BGDistribution = React.createClass({
  propTypes: {
    bgClasses: React.PropTypes.object.isRequired,
    bgUnits: React.PropTypes.string.isRequired,
    data: React.PropTypes.object.isRequired
  },

  componentWillMount: function() {
    var data = this.props.data;

    if (!_.isEmpty(data.bgDistribution)) {
      var distributionType = data.bgDistribution.cbg ? 'cbg' : 'smbg';
      this.setState({
        bothAvailable: !_.isEmpty(_.filter(data.bgDistribution.cbg, item => item > 0)) &&
          !_.isEmpty(_.filter(data.bgDistribution.smbg, item => item > 0)),
        data: data.bgDistribution[distributionType],
        showingCbg: distributionType === 'cbg'
      });
    }
  },

  componentDidMount: function() {
    var data = this.props.data;
    var bgClasses = this.props.bgClasses;
    var bgUnits = this.props.bgUnits;
    if (!_.isEmpty(data.bgDistribution)) {
      var chartNode = this.refs.chart;
      this.chart = bgBars.create(chartNode)
        .render(this.state.data, {
          bgClasses: bgClasses,
          bgUnits: bgUnits
        });
    }
  },

  componentDidUpdate: function() {
    var showingCbg = this.state.showingCbg;
    this.chart.update(this.props.data.bgDistribution[showingCbg ? 'cbg' : 'smbg']);
  },

  render: function() {
    var data = this.props.data;

    if (!_.isEmpty(data.bgDistribution)) {
      var dataToggle = this.renderDataToggle();
      return (
        <div className='BGDistribution'>
          {this.renderCgmStatus()}
          {dataToggle}
          <div ref='chart' className='BGDistribution-chart'></div>
        </div>
      );
    }
    return null;
  },

  renderCgmStatus: function() {
    if (this.state.bothAvailable) {
      return null;
    }
    var cgmStatus = this.props.data.bgDistribution.cgmStatus;
    var displayText = {};
    displayText[constants.NO_CGM] = 'Showing BGM data (no CGM)';
    displayText[constants.NOT_ENOUGH_CGM] = 'Showing BGM data (not enough CGM)';
    displayText[constants.CGM_CALCULATED] = 'Showing CGM data';
    return (
      <p className='BGDistribution-text BGDistribution-cgmStatus'>
        {displayText[cgmStatus]}
        <br/>
      </p>
    );
  },

  renderDataToggle: function() {
    var distribution = this.props.data.bgDistribution;
    if (this.state.bothAvailable) {
      return (
        <label>
          <span className='BGDistribution-togglelabel'>BGM&nbsp;</span>
          <Toggle
            defaultChecked={this.state.showingCbg}
            noImage={true}
            onChange={this.handleDataToggle} />
          <span>&nbsp;CGM</span>
        </label>
      );
    }
    return null;
  },

  handleDataToggle: function() {
    var showingCbg = this.state.showingCbg;
    this.setState({
      showingCbg: !showingCbg
    });
  }
});

module.exports = BGDistribution;
