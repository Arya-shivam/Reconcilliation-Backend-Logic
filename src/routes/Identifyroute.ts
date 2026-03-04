type reqBody = {
    email: string,
    phone: number
}
type contact = {
    primaryContactId: number,
    emails: string[],
    phoneNumbers: number[]
    secondaryContactIds: number[]
}
type resBody = {
    contact: contact
}

export const identifyRoute = (req: { body: reqBody }, res: resBody) => {
    const { email, phone } = req.body;
    
}