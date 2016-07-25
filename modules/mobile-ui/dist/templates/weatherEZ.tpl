<!-- weatherEZ.tpl -->
{{#with logo}}
    <div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}
    {{#with data}}
    <section class="primary">

        <h1 class="card__title">
            {{ returned_location }}
        </h1>

        {{#with alert}}
            <div class="alert">
                <div class="header">{{des}}</div>
                <div class="info">{{time}}</div>
            </div>
        {{/with}}
        
        <div class='EZ-weather-container weather__today'>
            <div class='EZ-weather-date'>{{ todayWeekday }}</div>
            <div class="EZ-weather-temp"><span>max.</span> {{todayTemp}}<span> / min.</span> {{todayMin}}</div>
            <div class="EZ-weather-img" data-style="background-image:url({{todayIcon}})"></div>
        
        </div>
        <div class="weather__gallery">
        {{#each forecast}}
            {{#if (limit @index 4)}}
                <div class='EZ-weather-container'>
                    <div class='EZ-weather-date'>{{ weekday }}</div>
                    <div class="EZ-weather-temp"><span>max.</span> {{max}}<span> / min.</span>{{min}}</div>
                    <div class="EZ-weather-img" data-style="background-image:url({{icon}})"></div>
                </div>
            {{/if}}
        
        {{/each}}
        </div>
        
        <div class="card__description">


            {{{data.description}}}

        </div>

    </section>
    
    <div class="poweredby">
        {{local 'more_on'}} <a href="http://www.weatherunderground.com">weatherunderground.com</a>
    </div>

{{/with}}
<!-- end weatherEZ.tpl -->
