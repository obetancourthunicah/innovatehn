module.exports.validateEmail = (email)=>{
    return (/^\S+@\S+\.\S+$/).test(email);
}
module.exports.validatePassword = (pswd)=>{
    return (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/).test(pswd);
}

module.exports.validateGender = (gender)=>{
    return (/^[NMF]$/).test(gender)
}
module.exports.isEmpty = (testValue) => {
  return (/^\s+$|^$/gi).test(testValue);
}
