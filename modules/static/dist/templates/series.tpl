<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px; margin-right: 32px">
    <div>
      <span class="cliqz-cluster-title-box overflow">
        {{ data.summary }}
      </span>
      <br style="clear:both"/>
    </div>
    <div class="cliqz-series-result-topic">
      {{#each data.topics}}
        <div class="cliqz-series-topic-label"
              style="color:{{color}};">{{label}}:
        </div>
        <div>
          <span class='cliqz-series-items overflow'>
          {{#each urls}}
            <span
                style="color: {{color}}; cursor: pointer"
                url='{{href}}'
                type='{{../../type}}'
                {{#if guessed}}
                  extra='guessed{{ @index }}'
                {{else}}
                  extra='topic{{ @index }}'
                {{/if}}
                class="cliqz-series-topic {{cls}}"
                >
                  {{ title }}
            </span>
          {{/each}}
          </span>
        </div>
      {{/each}}
    </div>
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}' newtab='true'>
  </div>
</div>
