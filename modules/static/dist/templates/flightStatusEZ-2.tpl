<div class='cqz-result-h2'>

  {{#with data}}
    <div class="flightStatusEZ-flightNumber" extra="title" url="{{ ../url }}">{{extra.flight_name}}</div>
    <div class="flightStatusEZ-flightStatus" style="color:{{extra.status_color}}">{{extra.status}}</div>
    <div class="flightStatusEZ-flightStatus">{{extra.status_detail}}</div>

    <div class="flightStatusEZ-plane-position">
      <img class="flightStatusEZ-plane-position-plane-img" src="{{extra.plane_icon}}"/>

      <div class="flightStatusEZ-plane-position-bar">
        <div class="flightStatusEZ-plane-position-dot" style="left:{{ extra.plane_position }}%; background:{{ extra.status_color }}"></div>
      </div>
    </div>

    <div class="flightStatusEZ-depart-arrival">
      <div class="flightStatusEZ-depart">
        <div class="flightStatusEZ-depart-arrival-name"> {{extra.depart_arrive.0.location_name}} </div>
        <div style="color: {{extra.depart_arrive.0.time_color}}">{{extra.depart_arrive.0.estimate_actual_time}}</div>
        <div> {{extra.depart_arrive.0.estimate_actual_date}} </div>
        <div>{{local 'Terminal'}} {{extra.depart_arrive.0.terminal}}</div>
        <div>{{local 'Gate'}} {{extra.depart_arrive.0.gate}}</div>
      </div>

      <div class="flightStatusEZ-arrival">
        <div class="flightStatusEZ-depart-arrival-name"> {{extra.depart_arrive.1.location_name}} </div>
        <div style="color: {{extra.depart_arrive.1.time_color}}">{{extra.depart_arrive.1.estimate_actual_time}}</div>
        <div> {{extra.depart_arrive.1.estimate_actual_date}} </div>
        <div>{{local 'Terminal'}} {{extra.depart_arrive.1.terminal}}</div>
        <div>{{local 'Gate'}} {{extra.depart_arrive.1.gate}}</div>
      </div>
    </div>

  {{/with}}
  {{> logo}}

</div>
