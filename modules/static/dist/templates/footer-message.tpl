<div class="cqz-message-bar {{type}}">
    <div class="cqz-message">
        <span>
            {{ simple_message }}
        </span>
        <strong>
            {{message}}

            {{#each messages}}
                {{#if this.correctBack}}
                    <i>{{this.correctBack}}</i>
                {{else}}
                    {{this.correct}}
                {{/if}}
            {{/each}}
        </strong>
    </div>
    <div class="cqz-message-btns"
        cliqz-action="footer-message-action"
        cliqz-telemetry="{{telemetry}}"
    >
        {{#each options}}
            <span class="cqz-msg-btn cqz-msg-btn-{{ state }} cqz-msg-btn-action-{{ action }}  border-box"
                state="{{ action }}"
                {{#if this.pref }} pref="{{ this.pref }}" {{/if}}
                {{#if prefVal }} prefVal="{{ prefVal }}" {{/if}} >
                {{ text }}
            </span>
        {{/each}}
    </div>
</div>
