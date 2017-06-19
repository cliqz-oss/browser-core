<!-- simple-result.tpl -->
<div class='cqz-result-simple' local-source='{{data.localSource}}' url='{{url}}'>
    <span class='cqz-icon-simple' style="left:{{math data.resultXPosition '-' 25}}px;">
        <img class='result-icon-placeholder' url='{{url}}' {{#if data.resultIcon}} src='{{data.resultIcon}}' {{/if}}/>
    </span>
    <span class='cqz-main-result-container-simple' style='margin-left:{{data.resultXPosition}}px; min-width: {{width}}px; width: {{width}}px'>
        <span class='cqz-logo-simple'>
          {{>simple-ui/logo}}
        </span>
        {{#unless data.extra.is_calculus}}
          <span class='cqz-title-simple' extra="title">
            <a href='{{url}}' extra="title">{{emphasis title text 2 true}}</a>
          </span>
        {{else}}
          <span class='cqz-title-simple calculator-simple'>
            {{emphasis title text 2 true}}
          </span>
        {{/unless}}
        <span class='cqz-url-simple' extra="url">
          {{emphasis urlDetails.friendly_url text 2 true}}
        </span>
    </span>

</div>
