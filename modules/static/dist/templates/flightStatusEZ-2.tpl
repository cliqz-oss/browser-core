<div class='cqz-result-h2'>

  {{#with data}}
    <div class="flightStatusEZ-flightNumber" extra="title" url="{{ ../url }}">{{flight_name}}</div>
    <div class="flightStatusEZ-flightStatus" style="color:{{status_color}}">{{status}}</div>
    <div class="flightStatusEZ-flightStatus">{{status_detail}}</div>

    <div class="flightStatusEZ-plane-position">
      <img class="flightStatusEZ-plane-position-plane-img" src="{{plane_icon}}"/>

      <div class="flightStatusEZ-plane-position-bar">
        <div class="flightStatusEZ-plane-position-dot" style="left:{{ plane_position }}%; background:{{ status_color }}"></div>
      </div>
    </div>

    <div class="flightStatusEZ-depart-arrival">
      <div class="flightStatusEZ-depart">
        <div class="flightStatusEZ-depart-arrival-name"> {{depart_arrive.0.location_name}} </div>
        <div style="color: {{depart_arrive.0.time_color}}">{{depart_arrive.0.estimate_actual_time}}</div>
        <div> {{depart_arrive.0.estimate_actual_date}} </div>
        <div>{{local 'Terminal'}} {{depart_arrive.0.terminal}}</div>
        <div>{{local 'Gate'}} {{depart_arrive.0.gate}}</div>
      </div>

      <div class="flightStatusEZ-arrival">
        <div class="flightStatusEZ-depart-arrival-name"> {{depart_arrive.1.location_name}} </div>
        <div style="color: {{depart_arrive.1.time_color}}">{{depart_arrive.1.estimate_actual_time}}</div>
        <div> {{depart_arrive.1.estimate_actual_date}} </div>
        <div>{{local 'Terminal'}} {{depart_arrive.1.terminal}}</div>
        <div>{{local 'Gate'}} {{depart_arrive.1.gate}}</div>
      </div>
    </div>

  {{/with}}
  {{> logo}}

</div>
