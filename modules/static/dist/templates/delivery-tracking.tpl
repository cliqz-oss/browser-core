<div class="cqz-result-h2 cqz-result-padding cqz-ez-delivery">

    <div>
        <div extra="title" class='cqz-result-title overflow' arrow="false" arrow-override=''>
            <a href="{{url}}" extra="title">
                 {{ data.name }} {{ data.trackid }}
            </a>
        </div>

        <div class='cqz-result-url overflow' extra="url">
            {{ emphasis urlDetails.friendly_url text 2 true }}
        </div>

        <div class="cqz-delivery-status-boxes-holder">
            {{#each data.links}}
                <span class="cqz-status-box
                            cqz-status-box-active-{{ this.step_status }}
                            cqz-status-box-name-{{ this.step_name }} "
                      style="background-image: url({{ this.icon_url }});"
                      url="{{this.url}}"
                      extra="item-{{ this.logg_as }}"
                >
                    {{ this.step_name }}
                </span>
            {{/each}}
        </div>
        <div class="cqz-delivery-info">
            <p>
                <span class="cqz-delivery-info-status">{{ data.status }}</span>
                <span class="cqz-delivery-info-date">{{ data.date }}</span>
            </p>
            <p class="cqz-delivery-info-msg">
                {{ data.message }}
            </p>
        </div>
    </div>

    {{> logo}}
</div>