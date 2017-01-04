import UIKit

struct Message {
    enum Kind: Int {
        case longerMoreThanAMinute
        case longerOneMinute
        case longerLessThanAMinute

        case shorterMoreThanAMinute
        case shorterOneMinute
        case shorterLessThanAMinute

        case longerTomorrowMoreThanAMinute
        case longerTomorrowOneMinute
        case longerTomorrowLessThanAMinute

        case shorterTomorrowMoreThanAMinute
        case shorterTomorrowOneMinute
        case shorterTomorrowLessThanAMinute

        init(sunPhase: SunPhase, yesterdayDaylightLength: Double, todayDaylightLength: Double, tomorrowDaylightLength: Double) {
            var kindRawValue = 0

            if sunPhase == .night {
                let tomorrowIsLonger = tomorrowDaylightLength - todayDaylightLength > 0
                if tomorrowIsLonger {
                    let addedTimeInSeconds = tomorrowDaylightLength - todayDaylightLength

                    if addedTimeInSeconds > 150 {
                        kindRawValue = Message.Kind.longerTomorrowMoreThanAMinute.rawValue
                    } else if addedTimeInSeconds > 60 {
                        kindRawValue = Message.Kind.longerTomorrowOneMinute.rawValue
                    } else {
                        kindRawValue = Message.Kind.longerTomorrowLessThanAMinute.rawValue
                    }
                } else {
                    let subtractedTimeInSeconds = todayDaylightLength - tomorrowDaylightLength

                    if subtractedTimeInSeconds > 150 {
                        kindRawValue = Message.Kind.shorterTomorrowMoreThanAMinute.rawValue
                    } else if subtractedTimeInSeconds > 60 {
                        kindRawValue = Message.Kind.shorterTomorrowOneMinute.rawValue
                    } else {
                        kindRawValue = Message.Kind.shorterTomorrowLessThanAMinute.rawValue
                    }
                }
            } else {
                let todayIsLonger = todayDaylightLength - yesterdayDaylightLength > 0
                if todayIsLonger {
                    let addedTimeInSeconds = todayDaylightLength - yesterdayDaylightLength

                    if addedTimeInSeconds > 150 {
                        kindRawValue = Message.Kind.longerMoreThanAMinute.rawValue
                    } else if addedTimeInSeconds > 60 {
                        kindRawValue = Message.Kind.longerOneMinute.rawValue
                    } else {
                        kindRawValue = Message.Kind.longerLessThanAMinute.rawValue
                    }
                } else {
                    let subtractedTimeInSeconds = yesterdayDaylightLength - todayDaylightLength

                    if subtractedTimeInSeconds > 150 {
                        kindRawValue = Message.Kind.shorterMoreThanAMinute.rawValue
                    } else if subtractedTimeInSeconds > 60 {
                        kindRawValue = Message.Kind.shorterOneMinute.rawValue
                    } else {
                        kindRawValue = Message.Kind.shorterLessThanAMinute.rawValue
                    }
                }
            }

            self.init(rawValue: kindRawValue)!
        }
    }

    init(format: String) {
        self.format = format
    }

    let format: String

    var content: String {
        return self.format.replacingOccurrences(of: "**", with: "")
    }

    var coloredPart: String {
        let regex = try! NSRegularExpression(pattern: "\\*\\*([^\"]*)\\*\\*")
        let nsString = self.format as NSString
        let results = regex.matches(in: self.format, range: NSRange(location: 0, length: nsString.length))
        if let firstResultRange = results.first?.range {
            let foundPart = nsString.substring(with: firstResultRange)

            return foundPart.replacingOccurrences(of: "**", with: "")
        } else {
            return ""
        }
    }

    func attributedString(withTextColor textColor: UIColor) -> NSAttributedString {
        let range = (self.content as NSString).range(of: self.coloredPart)
        let attributedString = NSMutableAttributedString(string: self.content)
        attributedString.addAttribute(NSForegroundColorAttributeName, value: textColor, range: range)

        return attributedString
    }
}
