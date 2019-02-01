import BaseResult from './base';

export default class FlightResult extends BaseResult {
  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _flightDetails() {
    return this._extra.depart_arrive || {};
  }

  get template() {
    return 'flight';
  }

  get oldApi() {
    return this.rawResult.data.old_api;
  }

  get name() {
    return this._extra.flight_name;
  }

  get flightStatus() {
    return this._extra.flight_status;
  }

  get status() {
    return this._extra.status;
  }

  get statusColor() {
    return this._extra.status_color;
  }

  get statusDetail() {
    return this._extra.status_detail;
  }

  get planeIcon() {
    return this._extra.plane_icon;
  }

  get planePosition() {
    return this._extra.plane_position;
  }

  get showDepartureScheduledTime() {
    return this.departure.scheduledTime !== this.departure.actualTime;
  }

  get showArrivalScheduledTime() {
    return this.arrival.scheduledTime !== this.arrival.actualTime;
  }

  get earlyDeparture() {
    return this.departure.actualTime < this.departure.scheduledTime;
  }

  get lateDeparture() {
    return this.departure.actualTime > this.departure.scheduledTime;
  }

  get earlyArrival() {
    return this.arrival.actualTime < this.arrival.scheduledTime;
  }

  get lateArrival() {
    return this.arrival.actualTime > this.arrival.scheduledTime;
  }

  get departure() {
    const depart = this._flightDetails['0'];
    return {
      locationName: depart.location_name,
      locationShortcut: depart.location_short_name,
      timeColor: depart.time_color,
      scheduledTime: depart.scheduled_time,
      scheduledDate: depart.scheduled_date,
      actualTime: depart.estimate_actual_time,
      terminal: depart.terminal_full,
      gate: depart.gate_full,
      GMT: depart.GMT
    };
  }

  get arrival() {
    const arrival = this._flightDetails['1'];
    return {
      locationName: arrival.location_name,
      locationShortcut: arrival.location_short_name,
      actualLocation: arrival.actual_location_short_name || '',
      timeColor: arrival.time_color,
      scheduledTime: arrival.scheduled_time,
      scheduledDate: arrival.scheduled_date,
      actualTime: arrival.estimate_actual_time,
      terminal: arrival.terminal_full,
      gate: arrival.gate_full,
      GMT: arrival.GMT
    };
  }

  get selectableResults() {
    return [];
  }

  get allResults() {
    return [
      ...(this.url ? [this] : []),
    ];
  }
}
