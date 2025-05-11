#  Deployment Script: React + Express on AWS
This script automates the deployment of a React frontend and Express backend to AWS services including EC2, S3, IAM, and Elastic Beanstalk.

### IMPORTANT:
  Replace all __PLACEHOLDER__ values with your actual AWS resource IDs and configuration.

  Overview of Steps
  Configuration Setup
Define AWS region, project name, resource IDs (VPC, Subnet, etc.), and other constants used across deployment.

  Create S3 Bucket
Used to store media files (like user uploads) with CORS configuration and a public-read policy for the uploads/ folder.

  Create Security Group
Sets up rules to allow SSH (port 22), HTTP (port 80), and HTTPS (port 443) traffic. Ensures only your IP can SSH into EC2.

   Launch EC2 Instance (for Express backend)
Spins up an EC2 instance with Amazon Linux 2 AMI, connects IAM role and security group, and executes ec2-user-data.sh (you’ll configure this script to install dependencies and run your Express server).

  Deploy React Frontend on Elastic Beanstalk

Builds the React app pointing to the backend EC2 instance.

Deploys the build to AWS Elastic Beanstalk using the EB CLI.

  Monitor & Access
Use eb status, eb health, and eb open to check your app’s deployment and open it in the browser.


#!/usr/bin/env bash
#
# Deployment Reference Script for React + Express on AWS
# Replace all __PLACEHOLDER__ values with your actual resource names/IDs.

set -euo pipefail
IFS=$'\n\t'

### 1. Configuration (edit these) ###
AWS_REGION="us-east-1"
PROJECT_NAME="my-blog-app"
VPC_ID="__YOUR_VPC_ID__"
SUBNET_ID="__YOUR_PUBLIC_SUBNET_ID__"
RDS_ENDPOINT="__YOUR_RDS_ENDPOINT__.rds.amazonaws.com"
S3_BUCKET_NAME="${PROJECT_NAME}-media"
EC2_KEY_PAIR="${PROJECT_NAME}-key"
EC2_INSTANCE_TYPE="t3.micro"
AMI_ID="ami-0c55b159cbfafe1f0"   # Amazon Linux 2
SG_NAME="${PROJECT_NAME}-backend-sg"
ROLE_NAME="${PROJECT_NAME}-ec2-role"
PROFILE_NAME="${PROJECT_NAME}-ec2-profile"

### 2. Create S3 Bucket ###
aws s3api create-bucket \
  --bucket "${S3_BUCKET_NAME}" \
  --region "${AWS_REGION}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}"

# Configure CORS for uploads
aws s3api put-bucket-cors \
  --bucket "${S3_BUCKET_NAME}" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET","PUT","POST","DELETE"],
        "AllowedOrigins": ["*"]
      }
    ]
  }'

# Public-read policy for a specific uploads folder
aws s3api put-bucket-policy \
  --bucket "${S3_BUCKET_NAME}" \
  --policy "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[
      {
        \"Sid\":\"PublicReadUploads\",
        \"Effect\":\"Allow\",
        \"Principal\":\"*\",
        \"Action\":\"s3:GetObject\",
        \"Resource\":\"arn:aws:s3:::${S3_BUCKET_NAME}/uploads/*\"
      }
    ]
  }'



### 4. Security Group ###
SG_ID=$(aws ec2 create-security-group \
  --group-name "${SG_NAME}" \
  --description "Backend SG for ${PROJECT_NAME}" \
  --vpc-id "${VPC_ID}" \
  --query 'GroupId' --output text)

# Ingress: SSH from your IP, HTTP/HTTPS from anywhere
MY_IP=$(curl -s https://checkip.amazonaws.com)/32

aws ec2 authorize-security-group-ingress \
  --group-id "${SG_ID}" \
  --protocol tcp --port 22 --cidr "${MY_IP}"

aws ec2 authorize-security-group-ingress \
  --group-id "${SG_ID}" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id "${SG_ID}" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

### 5. Launch EC2 (Express Backend) ###
aws ec2 run-instances \
  --image-id "${AMI_ID}" \
  --instance-type "${EC2_INSTANCE_TYPE}" \
  --key-name "${EC2_KEY_PAIR}" \
  --security-group-ids "${SG_ID}" \
  --subnet-id "${SUBNET_ID}" \
  --iam-instance-profile Name="${PROFILE_NAME}" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-backend}]" \
  --user-data file://ec2-user-data.sh

### 6. Build & Deploy React Frontend on Elastic Beanstalk ###
cd frontend

# Create React .env to point at your API
cat > .env <<EOF
REACT_APP_API_URL=http://__EC2_PUBLIC_IP_OR_DOMAIN__/data
EOF

npm install
npm run build

# Initialize & deploy with EB CLI
eb init "${PROJECT_NAME}-frontend" --platform "Node.js" --region "${AWS_REGION}"
eb create "${PROJECT_NAME}-frontend-env"

### 7. Monitor & Open ###
eb status
eb health
eb open


