set dotenv-load := true

export AWS_PAGER := ""

# ユーザを作成し、一時パスワードを設定する
create-user USERNAME PASSWORD:
    aws cognito-idp admin-create-user \
    --user-pool-id $COGNITO_USER_POOL_ID \
    --username {{USERNAME}} \
    --temporary-password {{PASSWORD}} \
    --user-attributes Name=email,Value={{USERNAME}} \
    --message-action SUPPRESS \
    --profile $AWS_PROFILE

# 一時パスワードを本パスワードに更新する
update-password USERNAME PASSWORD:
    aws cognito-idp admin-respond-to-auth-challenge \
        --user-pool-id $COGNITO_USER_POOL_ID \
        --client-id $COGNITO_CLIENT_ID \
        --challenge-name NEW_PASSWORD_REQUIRED \
        --challenge-responses USERNAME={{USERNAME}},NEW_PASSWORD={{PASSWORD}} \
        --session $(aws cognito-idp admin-initiate-auth \
            --user-pool-id $COGNITO_USER_POOL_ID \
            --client-id $COGNITO_CLIENT_ID \
            --auth-flow ADMIN_NO_SRP_AUTH \
            --auth-parameters USERNAME={{USERNAME}},PASSWORD={{PASSWORD}} \
            --profile $AWS_PROFILE \
            --query 'Session' \
            --output text) \
        --profile $AWS_PROFILE

# Emailを検証済みにする
verify-email USERNAME:
    aws cognito-idp admin-update-user-attributes \
        --user-pool-id $COGNITO_USER_POOL_ID \
        --username {{USERNAME}} \
        --user-attributes Name=email_verified,Value=true \
        --profile $AWS_PROFILE

# IDトークンを取得し、クリップボードにコピーする
get-token USERNAME PASSWORD:
    aws cognito-idp initiate-auth \
        --auth-flow USER_PASSWORD_AUTH \
        --client-id $COGNITO_CLIENT_ID \
        --auth-parameters USERNAME={{USERNAME}},PASSWORD={{PASSWORD}} \
        --query 'AuthenticationResult.IdToken' \
        --output text \
        --profile $AWS_PROFILE | tr -d '\n'

# ユーザをアプリ登録する
register-user USERNAME PASSWORD PLAN:
    curl -X POST "$API_URL/users" \
        -H "Authorization: Bearer $(just get-token {{USERNAME}} {{PASSWORD}})" \
        -H "Content-Type: application/json" \
        -d '{"name": "{{USERNAME}}", "plan": "{{PLAN}}"}'

setup-user USERNAME PASSWORD PLAN:
    - just create-user {{USERNAME}} {{PASSWORD}}
    - just update-password {{USERNAME}} {{PASSWORD}}
    - just verify-email {{USERNAME}}
    - just register-user {{USERNAME}} {{PASSWORD}} {{PLAN}}

setup-users:
    just setup-user $GUEST_USER_USERNAME $GUEST_USER_PASSWORD guest
    just setup-user $TRIAL_USER_USERNAME $TRIAL_USER_PASSWORD trial
    just setup-user $BASIC_USER_USERNAME $BASIC_USER_PASSWORD basic
    just setup-user $PRO_USER_USERNAME $PRO_USER_PASSWORD pro
    just setup-user $ADMIN_USER_USERNAME $ADMIN_USER_PASSWORD pro # 仮で pro プランで登録
    just setup-user $DEVELOPER_USER_USERNAME $DEVELOPER_USER_PASSWORD pro # 仮で pro プランで登録

guest:
    just get-token $GUEST_USER_USERNAME $GUEST_USER_PASSWORD | pbcopy

trial:
    just get-token $TRIAL_USER_USERNAME $TRIAL_USER_PASSWORD | pbcopy

basic:
    just get-token $BASIC_USER_USERNAME $BASIC_USER_PASSWORD | pbcopy

pro:
    just get-token $PRO_USER_USERNAME $PRO_USER_PASSWORD | pbcopy

admin:
    just get-token $ADMIN_USER_USERNAME $ADMIN_USER_PASSWORD | pbcopy

developer:
    just get-token $DEVELOPER_USER_USERNAME $DEVELOPER_USER_PASSWORD | pbcopy

login:
    aws sso login
