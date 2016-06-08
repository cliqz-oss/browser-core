<div class="cqz-result-h1 nopadding ez-weather">
    {{#with data}}
        {{#with alert}}
            <div class="alert" style="background-color:{{alert-color}}">
                <div class="header">{{des}}</div>
                <div class="info">{{time}}</div>
            </div>
        {{/with}}

        <div class="cqz-result-h2">
            <div class='cqz-ez-title cqz-ez-black-title' arrow-override='' extra="title">
                <span url="{{../url}}" extra="title">{{ returned_location }}</span>
            </div>
            <div class="cqz-weather-holder">
                <div class="EZ-weather-info-sec">
                    <div class='EZ-weather-container'>
                        <div class='EZ-weather-date'>{{ todayWeekday }}</div>
                        <div class="EZ-weather-img" style="background-image:url({{todayIcon}})"></div>
                        <div class="EZ-weather-temp">{{ todayMax }}<span>{{todayMin}}</span></div>
                    </div>

                    {{#each forecast}}
                        <div class='EZ-weather-container'>
                            <div class='EZ-weather-date'>{{ weekday }}</div>
                            <div class="EZ-weather-img" style="background-image:url({{icon}})"></div>
                            <div class="EZ-weather-temp">{{max}}<span>{{min}}</span>
                            </div>
                        </div>
                    {{/each}}
                </div>
            </div>
        {{/with}}

        {{# if data.forecast_url}}
           {{>partials/ez-generic-buttons}}
        {{/if}}
        </div>
    {{>logo}}
</div>
