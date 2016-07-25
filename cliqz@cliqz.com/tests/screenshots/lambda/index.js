/*
 * HOW IT WORKS
 *  - this Lambda function has as event source "S3 Object Created" and is hooked up
 *    to bucket "tests-dropdown-appearance" (in the Lambda function configuration page)
 *  - it checks all new objects for keys that contain "mosaic", creates an email with
 *    the image as attachement (using the MailComposer Node.JS module), and sends the
 *    email via AWS SES
 *  - a user who is allowed to send emails is required for SES (it does not work to grant
 *    sending rights to a role); this user is called "tests-dropdown-appearance-ses" and its
 *    credentials are passed to the SES constructur in this script
 *
 * DEPLOYING
 *  - install Node.JS modules AWS SDK and Mailcomposer
 *          sudo npm install mailcomposer
 *          sudo npm install aws-sdk
 *  - zip containing folder (make sure that in the zipped file index.js is _not_
 *    in a sub-folder; otherwise, Lambda won't find it)
 *  - upload archive to Lambda
 *    (https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/VisualTestingScreenshotsAdded)
 *
 * NOTES
 *  - simply hooking up the object-created event to SNS allows for pushing email notifcations,
 *    but does not allow for attaching images to the email
 */

console.log('Loading function');

var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var ses =
    new aws.SES({
        accessKeyId: 'AKIAJFBODEFNZWT3PITQ',
        secretAccessKey: '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'});

var MailComposer = require('mailcomposer').MailComposer,
    mailcomposer = new MailComposer();

exports.handler = function(event, context) {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    var params = {
        Bucket: bucket,
        Key: key
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            console.log(err);
            var message = 'error getting object ' + key + ' from bucket ' + bucket;
            console.log(message);
            context.fail(message);
        } else {
            console.log('checking key ' + key + ' with content type ' + data.ContentType);
            if (key.indexOf('mosaic') > -1 && data.ContentType == 'image/png') {
                console.log('new mosaic image found')

                mailcomposer.setMessageOption({
                    from: 'dominik.s@cliqz.com',
                    to: 'dominik.s@cliqz.com,panagiota@cliqz.com,sean@cliqz.com,elyse@cliqz.com,thuy@cliqz.com,stefanie@cliqz.com',
                    subject: '[testing] new dropdown screenshots (width: ' + key.split('width-')[1].split('/')[0] + ')',
                    body: 's3://' + bucket + '/' + key,
                    html: 's3://' + bucket + '/' + key +
                          '<br/><br/><img src="cid:' + key + '" />'

                });
                var attachment = {
                    contents: data.Body,
                    contentType: 'image/png',
                    cid: key
                };
                mailcomposer.addAttachment(attachment);
                console.log('buidling mosaic mail...')
                mailcomposer.buildMessage(function(err, messageSource) {
                    if (err) {
                        console.log('mailcomposer error: ' + err);
                        context.fail();
                    } else {
                        console.log('sending mosaic mail...')
                        ses.sendRawEmail({RawMessage: {Data: messageSource}}, function(err, data) {
                            if(err) {
                                console.error('error sending mosaic mail via SES ' + err);
                                context.fail();
                            } else {
                                console.info('mosaic mail sent via SES');
                                context.done(null, data);
                            }
                        });
                    }
                });
            }
        }
    });
};