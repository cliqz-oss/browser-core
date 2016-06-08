<div class='onboarding-callout' style="padding: 0px;">
	<div class="msg-container">
		{{ message }}
	</div>
	
	<div class="btn-container">
		{{#each options}}
			<span class="cqz-btn cqz-btn-{{ state }}" cliqz-action="{{ action }}">{{ label }}</span>		
		{{/each}}
	</div>
</div>