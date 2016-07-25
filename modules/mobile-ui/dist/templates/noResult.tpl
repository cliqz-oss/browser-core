<!-- noResult.tpl -->

  {{#with data}}
    <div id="defaultEngine" style="background: #245C92;padding: 30px;color: #fff;text-align: center;height:100%" 
          url="{{searchEngineUrl}}{{searchString}}" kind="CL" class="cqz-result-box">
            <h3 class="no-results-title">{{ title }}</h3>
      {{#with logo}}
        <div id="searchEngineLogo"
         class="search_engine_logo"
         style="{{style}}"
         >
        </div>
      {{/with}}
      </div>
{{/with}}

<!-- end noResult.tpl -->
