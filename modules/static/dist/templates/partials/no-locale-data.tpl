<div class="location_permission_prompt">
    <div class="loc_permission_prompt_message">
       {{#if (logic display_msg '===' 'location-sorry') }}
            {{local 'location_sorry_msg'}}
       {{/if}}

       {{#if (logic display_msg '===' 'location-no') }}
            {{local 'location_not_share_msg'}}
       {{/if}}

       {{#if (logic display_msg '===' 'location-thank-you') }}
            {{local 'location_thank_you_msg'}}
       {{/if}}

       {{#if (logic display_msg '===' 'location-permission-ask') }}
            {{local 'no_local_data_msg'}}
       {{/if}}
    </div>

   {{#if (logic display_msg '===' 'location-permission-ask') }}
        <div class="loc_permission_prompt_buttons">
            <span class="cqz-btn-default cqz-btn-yes" id="cqz_location_yes_confirm">
                {{local 'yes'}}
            </span>
        </div>
   {{/if}}
</div>
