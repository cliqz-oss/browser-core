<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding cqz-ez-generic"
  {{else}}
    class="cqz-result-h2 cqz-result-padding cqz-ez-generic"
  {{/if}}
>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="cqz-ez-title custom-after cqz-ez-generic-title cqz-ez-banking-title">

          <a href="{{../url}}" extra="title">{{ emphasis name ../text 2 true }}</a>
        </div>
        <div class="clearfix cqz-ez-subtitle" extra="url">
          {{ emphasis ../urlDetails.friendly_url text 2 true }}
        </div>

        <div class="cqz-ez-generic-elems">
            <div class="cqz-ez-generic-box">
                {{#each actions }}
                    <div
                        class="cqz-ez-btn {{ ../../logo.buttonsClass }}"
                        extra="action-{{ @index }}"
                        url="{{url}}" arrow="false"
                        >{{ title }}</div>
                {{/each}}
            </div>
            {{#each links }}
                <div class="cqz-ez-generic-box cqz-ez-generic-opt overflow"
                     url="{{ url }}"
                     show-status='true'
                     extra="link-{{ @index }}">
                     <div
                        show-status='true'
                        style="background-image: url({{ icon }});"
                        class="transition"
                     >
                     </div>
                    {{ title }}
                </div>
            {{/each}}
        </div>
    {{/with}}

    {{>EZ-history}}
    {{>logo}}

</div>


