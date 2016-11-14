<div class="local-sc-data-container">
    <div class="location_permission_prompt">
        <div class="loc_permission_prompt_message">
          {{local 'location_permission_prompt'}}
        </div>
        <div class="loc_permission_prompt_buttons">
            <span class="cqz-btn-default" id="cqz_location_yes" bm_url='{{ url }}'>
                {{local 'yes'}}
            </span>
            <span class="cqz-btn-error" id="cqz_location_once" location_dialogue_step="1" bm_url='{{ url }}'>
                {{local 'location_just_once'}}
            </span>
            <span class="cqz-btn-error" id="cqz_location_no" local_sc_type='{{data.sc_type}}' bm_url='{{ url }}'>
                {{local 'location_never'}}
            </span>
        </div>
    </div>
</div>
