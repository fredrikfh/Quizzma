#!/bin/bash

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DB_PATH="backend/app/database/database.db"
BUCKET_NAME="db-backup-s3-v2"
DEST_PATH="s3://$BUCKET_NAME/backups/database_$TIMESTAMP.db"

# Optionally, compress the database before uploading
# gzip -c $DB_PATH > /tmp/database_$TIMESTAMP.db.gz
# aws s3 cp /tmp/database_$TIMESTAMP.db.gz $DEST_PATH.gz

# Upload the database file to S3
aws s3 cp $DB_PATH $DEST_PATH
echo "Backup completed at $TIMESTAMP, uploaded to $DEST_PATH" >> /var/log/s3_backup.log

# Heartbeat monitor
curl -X POST https://uptime.betterstack.com/api/v1/heartbeat/msYh5MApuK4ia8sAigAE1DNb