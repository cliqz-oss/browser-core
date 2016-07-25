<div class="cqz-result-h2 ez-weather cqz-ez-black-title">

    {{#with data}}
        <div class='cqz-ez-title' arrow-override='' extra="title">
            <span url="{{../url}}" extra="title">{{ returned_location }}</span>
        </div>

        <div class="cqz-weather-holder">
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
    {{/with}}
    {{# if data.forecast_url}}
       {{>partials/ez-generic-buttons}}
    {{/if}}
    {{>logo}}
</div>