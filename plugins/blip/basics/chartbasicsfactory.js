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

// in order to get d3.chart dependency
var tideline = require('../../../js/');

var _ = require('lodash');
var bows = require('bows');
var d3 = require('d3');
var moment = require('moment-timezone');
var React = require('react');

var sundial = require('sundial');

require('./less/basics.less');
var debug = bows('Basics Chart');
var basicsState = require('./logic/state');
var basicsActions = require('./logic/actions');
var dataMungerMkr = require('./logic/datamunger');
var constants = require('./logic/constants');

var Section = require('./components/DashboardSection');
var togglableState = require('./TogglableState');

var dataUrl = 'data/blip-input.json';

var BasicsChart = React.createClass({
  propTypes: {
    bgClasses: React.PropTypes.object.isRequired,
    bgUnits: React.PropTypes.string.isRequired,
    onSelectDay: React.PropTypes.func.isRequired,
    patient: React.PropTypes.object.isRequired,
    patientData: React.PropTypes.object.isRequired,
    permsOfLoggedInUser: React.PropTypes.object.isRequired,
    timePrefs: React.PropTypes.object.isRequired,
    updateBasicsData: React.PropTypes.func.isRequired,
    updateBasicsSettings: React.PropTypes.func.isRequired,
    trackMetric: React.PropTypes.func.isRequired,
  },
  _adjustSectionsBasedOnAvailableData: function(basicsData) {
    if (basicsData.sections.siteChanges.type !== constants.SECTION_TYPE_UNDECLARED) {
      // check that site change section has data within range of current view
      var hasSiteChangeData = _.some(basicsData.data[basicsData.sections.siteChanges.type].data, function(datum) {
        return (datum.time >= basicsData.dateRange[0]);
      });

      if (!hasSiteChangeData) {
        basicsData.sections.siteChanges.active = false;
      }
    }
    if (_.isEmpty(basicsData.data.calibration.data)) {
      var fingerstickSection = _.find(basicsData.sections, function(section) {
        return section.type === 'fingerstick';
      });

      fingerstickSection.selectorOptions.rows.forEach(function(row) {
        var calibrationSelector = _.find(row, function(option) {
          return option.key === 'calibration';
        });
        if (calibrationSelector) {
          calibrationSelector.active = false;
        }
      });
    }
    if (_.isEmpty(basicsData.data.basalBolusRatio)) {
      var basalBolusRatioSection = _.find(basicsData.sections, function(section) {
        return section.id === 'basalBolusRatio';
      });
      basalBolusRatioSection.noData = true;
      basalBolusRatioSection.togglable = togglableState.off;
    }
    if (basicsData.data.totalDailyDose == null) {
      var totalDailyDoseSection = _.find(basicsData.sections, function(section) {
        return section.id === 'totalDailyDose';
      });
      totalDailyDoseSection.noData = true;
      totalDailyDoseSection.togglable = togglableState.closed;
    }
  },
  _aggregatedDataEmpty: function() {
    var {
      basalBolusRatio,
      averageDailyDose,
      averageDailyCarbs,
    } = this.state.data;

    if (basalBolusRatio === null || averageDailyDose === null || averageDailyCarbs === null) {
      return true;
    }
    return false;
  },
  componentWillMount: function() {
    var basicsData = this.props.patientData.basicsData;
    if (basicsData.sections == null) {
      basicsData = _.assign({}, basicsData, _.cloneDeep(basicsState));
      var dataMunger = dataMungerMkr(this.props.bgClasses, this.props.bgUnits);
      dataMunger.reduceByDay(basicsData);

      var latestPump = dataMunger.getLatestPumpUploaded(this.props.patientData);
      dataMunger.processInfusionSiteHistory(basicsData, latestPump, this.props.patient, this.props.permsOfLoggedInUser);

      basicsData.data.bgDistribution = dataMunger.bgDistribution(basicsData);
      var basalBolusStats = dataMunger.calculateBasalBolusStats(basicsData);
      basicsData.data.basalBolusRatio = basalBolusStats.basalBolusRatio;
      basicsData.data.averageDailyDose = basalBolusStats.averageDailyDose;
      basicsData.data.totalDailyDose = basalBolusStats.totalDailyDose;
      basicsData.data.averageDailyCarbs = basalBolusStats.averageDailyCarbs;
      this._adjustSectionsBasedOnAvailableData(basicsData);
    }
    this.setState(basicsData);
    basicsActions.bindApp(this);
  },
  componentDidMount: function() {
    if (this._aggregatedDataEmpty() && this.props.trackMetric) {
      this.props.trackMetric('web - pump vacation message displayed');
    }
  },
  componentWillUnmount: function() {
    var patientData = _.clone(this.props.patientData);
    patientData.basicsData = this.state;
    this.props.updateBasicsData(patientData);
  },
  render: function() {
    var leftColumn = this.renderColumn('left');
    var rightColumn = this.renderColumn('right');
    return (
      <div className='Container--flex'>
        <div className='Column Column--left'>
          {leftColumn}
        </div>
        <div className='Column Column--right'>
          {rightColumn}
        </div>
      </div>
    );
  },
  renderColumn: function(columnSide) {
    var self = this;
    var timePrefs = this.props.timePrefs;
    var tz = timePrefs.timezoneAware ? timePrefs.timezoneName : 'UTC';
    var sections = [];
    for (var key in this.state.sections) {
      var section = _.cloneDeep(self.state.sections[key]);
      section.name = key;
      sections.push(section);
    }
    var column = _.sortBy(
      _.where(sections, {column: columnSide}),
      'index'
    );

    return _.map(column, function(section, index) {
      return (
        <Section key={section.name}
          bgClasses={self.props.bgClasses}
          bgUnits={self.props.bgUnits}
          chart={section.chart}
          data={self.state.data}
          days={self.state.days}
          name={section.name}
          onSelectDay={self.props.onSelectDay}
          open={section.open}
          togglable={section.togglable}
          section={section}
          title={section.title}
          settingsTogglable={section.settingsTogglable}
          updateBasicsSettings={self.props.updateBasicsSettings}
          timezone={tz}
          trackMetric={self.props.trackMetric} />
      );
    });
  }
});

module.exports = BasicsChart;
