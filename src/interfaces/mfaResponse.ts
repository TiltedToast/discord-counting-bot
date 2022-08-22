export default interface mfaResponse {
    token: string;
    user_settings: {
        locale: string;
        theme: string;
    };
}
