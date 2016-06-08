{{!--
The dictionary template defines two snippet types:
- translation (for multilingual dictionaries) (multilang property);
- definition (for monolingual dictionaries + thesauri).
--}}
<div class='cliqz-inline-box-children cliqz-result-generic'>
    <div class='cliqz-result-left-box'>
        <div class='cliqz-result-type' ></div>
    </div>
    <div class='cliqz-result-mid-box' style="width:{{ width }}px">
        {{!-- the common part for both snippet types --}}
        <div class='cliqz-result-title-box'>
            {{ title }}
            {{#if data.richData.pronunciation}}
            <span class='cliqz-result-dictionary-pronunciation'>[ {{data.richData.pronunciation}} ]</span>
            {{/if}}
            <span class='cliqz-result-dictionary-pronunciation'
                  {{#unless data.richData.multilang}}style='display:none'{{/unless}}
                  cliqz-toggle='trans'>( {{data.richData.language}} )</span>
        </div>
        {{!-- TODO only for definitions? --}}
        {{#if data.richData.type}}
            <div class="cliqz-result-dictionary-type">
                {{data.richData.type}}
            </div>
        {{/if}}
        <div {{#if data.richData.multilang}}style='display:none'{{/if}}
             cliqz-toggle='defi'>
            {{!-- definition snippet --}}
            <div {{#if data.richData.translations}}
                 class='cliqz-result-dictionary-main'
                 style='width:{{math width "-" 110}}px'{{/if}}>
                <ol>
                    {{#each data.richData.definitions}}
                        <li>
                        <div class='cliqz-result-dictionary-definition'>
                            {{ definition }} {{#if type}} - <span class='cliqz-result-dictionary-subtype'>{{type}}</span>{{/if}}
                        </div>
                        </li>
                    {{/each}}
                </ol>
            </div>
            {{#if data.richData.translations}}
                <div class='cliqz-result-dictionary-toggler'>
                    <div cliqz-action="toggle"
                          toggle-id="trans"
                          toggle-context="cqz-result-box"
                          align="center">
                        {{data.richData.i18n.translations}}<br/>
                        {{#unless data.richData.multilang}}&gt;&gt;{{else}}&lt;&lt;{{/unless}}
                    </div>
                </div>
            {{/if}}
        </div>
        <div {{#unless data.richData.multilang}}style='display:none'{{/unless}}
             cliqz-toggle='trans'>
            {{!-- translation snippet --}}
            <div {{#if data.richData.definitions}}
                 class='cliqz-result-dictionary-main'
                 style='width:{{math width "-" 110}}px'{{/if}}>
                {{#with data.richData.translations.[0]}}
                    <div class='cliqz-result-dictionary-language-header'>{{language}}:</div>
                    <ol>
                        {{#each values}}
                            <li>
                            <div class='cliqz-result-dictionary-definition'>
                                {{this}}
                            </div>
                            </li>
                        {{/each}}
                    </ol>
                {{/with}}
            </div>
            {{#if data.richData.definitions}}
                <div class='cliqz-result-dictionary-toggler'>
                    <div cliqz-action="toggle"
                          toggle-id="defi"
                          toggle-context="cqz-result-box"
                          align="center">
                        {{data.richData.i18n.definitions}}<br/>
                        {{#if data.richData.multilang}}&gt;&gt;{{else}}&lt;&lt;{{/if}}
                    </div>
                </div>
            {{/if}}
        </div>
    </div>

    <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
         newtab='true'>
    </div>
</div>

{{!-- translation snippet --}}
<div class='cliqz-result-dictionary-translations'
     {{#unless data.richData.multilang}}style='display:none'{{/unless}}
     cliqz-toggle='trans'>
    {{#each data.richData.translations}}
        {{!-- the first translation is the main content --}}
        {{#unless @first}}
            <span style="display: inline-block;">
                <span class='cliqz-result-dictionary-translation-language'>{{language}}:</span>
                {{#each values}}
                    {{this}}
                {{/each}}
            </span>
        {{/unless}}
    {{/each}}
</div>
{{!-- definition snippet --}}
{{#if data.richData.synonyms}}
    <div class='cliqz-result-dictionary-synonyms'
         {{#if data.richData.multilang}}style='display:none'{{/if}}
         cliqz-toggle='defi'>
        <span class='cliqz-result-dictionary-synonyms-header'>{{data.richData.i18n.synonyms}}:</span>
        {{#each data.richData.synonyms}}
            <span>{{this}}{{#if @last}}{{else}},{{/if}}</span>
        {{/each}}
    </div>
{{/if}}
